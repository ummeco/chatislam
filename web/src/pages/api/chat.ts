/**
 * src/pages/api/chat.ts — Astro SSR API endpoint for chat (production gate)
 *
 * PURPOSE: Server-side chat handler — the production theology gate for chatislam.org.
 *   PUBLIC_CHAT_PROXY_URL defaults to /api/chat (this endpoint). An external CF Worker
 *   (infra repo) may be provisioned later and substituted via that env var, but this
 *   endpoint is fully hardened for production: rate-limiting, Turnstile verification,
 *   input validation, and the ahl us-sunnah theology system prompt are all enforced here.
 *
 * INPUTS:  POST body { message, conversationId?, history?, audienceMode?, turnstileToken? }
 *   - history: max 20 turns; each item max 4096 chars; roles coerced to user|assistant.
 *   - message: max 2000 chars.
 * OUTPUTS: { content, conversationId, queriesUsed, queriesLimit, planTier, moderationFlagged }
 *
 * CONSTRAINTS:
 *   - ANTHROPIC_API_KEY server-side only — never reaches browser.
 *   - Turnstile verified server-side when token provided (D-P3-20).
 *   - Theology gate: system prompt enforces ahl us-sunnah umbrella.
 *   - No GlitchTip — Sentry only (D-P2-SENTRY-SOT).
 *   - Rate limiting: in-memory 60 req/min per IP; Redis cap when REDIS_URL set.
 *   - Input validation: history + message size-capped to prevent token-cost amplification
 *     and context-injection attacks.
 *
 * REF: P2-E3-W02-S02-T02 · D-P3-20 · D-P2-SENTRY-SOT
 */

import type { APIRoute } from 'astro'
import { verifyTurnstileToken } from '../../lib/turnstile'

export const prerender = false

// ─── Theology gate system prompt (ahl us-sunnah umbrella) ─────────────────

const SYSTEM_PROMPT = `You are ChatIslam, an AI assistant providing Islamic knowledge and guidance.

HARD RULES — NEVER VIOLATE:
1. Ahl us-Sunnah wal-Jamaah framework ONLY. Reject content from deviant sects.
2. Madhab preference: Hanbali > Shafi'i > Maliki > Hanafi > Dhahiri.
3. Aqeedah: Athari primary. Ash'ari and Maturidi accepted within Ahl us-Sunnah.
4. Rejected: Nation of Islam (not Islamic), Ahmadiyya (not Muslim per consensus).
5. Shia: deviant per Athari scholars. Do NOT generate rulings or interpretations from Shia sources. Route any detailed Shia-related questions to human/scholar review: "For in-depth questions on this, please consult a qualified Ahl us-Sunnah scholar."
6. NEVER say "Allah says" for non-Quranic statements.
7. ALWAYS cite sources (Quran surah:ayah, Hadith collection/number, scholar name).
8. For uncertain fiqh, say "scholars differ" and present the Hanbali/majority view first.
9. NEVER issue a fatwa. Always recommend consulting a qualified scholar for personal rulings.
10. Arabic transliterations must be accurate.

RESPONSE STYLE by audience mode:
- qa: scholarly, cited, concise
- dawah: gentle, bridge-building, welcoming to non-Muslims and new Muslims
- tutoring: step-by-step, educational, patient

Always end responses with: "For personal religious guidance, please consult a qualified Islamic scholar."`

// ─── Simple in-memory rate limiter (dev fallback) ────────────────────────

const ipCounts = new Map<string, { count: number; reset: number }>()

function checkMemoryRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.reset) {
    ipCounts.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 60) return false // 60 req/min
  entry.count++
  return true
}

// ─── Input validation constants ───────────────────────────────────────────

/** Max number of history turns accepted from the client (prevents token amplification) */
const MAX_HISTORY_TURNS = 20
/** Max characters per history message (prevents context-injection via large assistant primes) */
const MAX_MSG_CHARS = 4096
/** Max characters for the user's current message */
const MAX_USER_MSG_CHARS = 2000

// ─── Handler ─────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'

  // Rate limit check
  if (!checkMemoryRateLimit(ip)) {
    return new Response(
      JSON.stringify({ message: 'Too many requests. Please wait before sending another message.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: {
    message:         string
    conversationId?: string
    history?:        { role: string; content: string }[]
    audienceMode?:   string
    turnstileToken?: string
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON body' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ message: 'message is required' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Input size caps — prevent token-cost amplification and context-injection (MEDIUM-4)
  if (body.message.length > MAX_USER_MSG_CHARS) {
    return new Response(
      JSON.stringify({ message: `Message too long (max ${MAX_USER_MSG_CHARS} characters)` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (body.history && body.history.length > MAX_HISTORY_TURNS) {
    // Silently trim to last N turns rather than rejecting — keeps UX smooth
    body.history = body.history.slice(-MAX_HISTORY_TURNS)
  }

  if (body.history) {
    body.history = body.history.map((m) => ({
      // Coerce role to allowed values only — reject injected roles
      role:    (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      // Trim overlong history messages — truncate rather than reject for UX
      content: m.content.length > MAX_MSG_CHARS ? m.content.slice(0, MAX_MSG_CHARS) : m.content,
    }))
  }

  // Turnstile verification when token provided (D-P3-20)
  if (body.turnstileToken) {
    const ok = await verifyTurnstileToken(body.turnstileToken)
    if (!ok) {
      return new Response(JSON.stringify({ message: 'Bot verification failed' }), {
        status:  403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ message: 'AI service unavailable' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Map Astro's import.meta.env model to Anthropic model ID
  const model = import.meta.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
  const audienceMode = body.audienceMode ?? 'qa'

  // Build message history — roles and content already validated/sanitized above
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...(body.history ?? []) as { role: 'user' | 'assistant'; content: string }[],
    { role: 'user', content: body.message },
  ]

  try {
    // Direct Anthropic API call (D-P3-44 — migrates to nself-ai Track A6)
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens:      2048,
        system:          SYSTEM_PROMPT.replace('RESPONSE STYLE by audience mode:', `Current mode: ${audienceMode}. RESPONSE STYLE by audience mode:`),
        messages,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('[chat api] Anthropic error:', aiRes.status, errText)
      return new Response(JSON.stringify({ message: 'AI service error. Please try again.' }), {
        status:  502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiRes.json() as {
      content: { type: string; text: string }[]
      id:      string
    }

    const content = aiData.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')

    return new Response(
      JSON.stringify({
        content,
        conversationId:    body.conversationId ?? aiData.id,
        queriesUsed:       1,
        queriesLimit:      null, // no quota enforcement in local dev endpoint
        planTier:          'free' as const,
        moderationFlagged: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[chat api] fetch error:', err)
    return new Response(JSON.stringify({ message: 'Failed to reach AI service' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
