/**
 * ChatIslam — Madhhab stance extraction + fiqh detection (CB-02 T11)
 *
 * Exports:
 *   MadhabTag          — the four Sunni madhahib + 'all'
 *   MadhabStance       — per-madhhab stance object
 *   extractMadhabStances()  — parse AI response for per-madhhab sections
 *   detectFiqhQuestion()    — Haiku classification (cached, 1h TTL)
 *   buildMadhabSystemPromptAddendum() — user's preferred madhhab prompt injection
 *
 * Hanbali is default per PRI. Theological guidelines never deviate.
 */

import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MadhabTag = 'hanafi' | 'maliki' | 'shafii' | 'hanbali' | 'all'

export interface MadhabStance {
  madhhab:     MadhabTag
  stance:      string
  /** Scholar citation source (required per Gate A; '' = uncited). Never omit. */
  source:      string
  is_majority: boolean
}

// ─── Redis for fiqh detection cache ─────────────────────────────────────────────

interface RedisLike {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
}

let _redis: RedisLike | null = null

function getRedis(): RedisLike | null {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const { Redis } = require('ioredis') as { Redis: new (url: string) => RedisLike }
    _redis = new Redis(url)
    return _redis
  } catch {
    return null
  }
}

// ─── Madhhab keyword markers ─────────────────────────────────────────────────────

const MADHHAB_MARKERS: Record<MadhabTag, RegExp[]> = {
  hanafi: [
    /(?:^|\n)\s*(?:\d\.\s*)?hanafi(?:\s+stance)?[:\s]/i,
    /according to\s+(?:the\s+)?hanafi/i,
    /in\s+(?:the\s+)?hanafi\s+(?:school|madhab|view|opinion)/i,
    /(?:imam\s+)?abu\s+hanifa[:\s]/i,
  ],
  maliki: [
    /(?:^|\n)\s*(?:\d\.\s*)?maliki(?:\s+stance)?[:\s]/i,
    /according to\s+(?:the\s+)?maliki/i,
    /in\s+(?:the\s+)?maliki\s+(?:school|madhab|view|opinion)/i,
    /(?:imam\s+)?malik(?:\s+ibn\s+anas)?[:\s]/i,
  ],
  shafii: [
    /(?:^|\n)\s*(?:\d\.\s*)?shafi'?i(?:\s+stance)?[:\s]/i,
    /according to\s+(?:the\s+)?shafi'?i/i,
    /in\s+(?:the\s+)?shafi'?i\s+(?:school|madhab|view|opinion)/i,
    /(?:imam\s+)?(?:al-)?shafi'?i[:\s]/i,
  ],
  hanbali: [
    /(?:^|\n)\s*(?:\d\.\s*)?hanbali(?:\s+stance)?[:\s]/i,
    /according to\s+(?:the\s+)?hanbali/i,
    /in\s+(?:the\s+)?hanbali\s+(?:school|madhab|view|opinion)/i,
    /(?:imam\s+)?(?:ibn\s+hanbal|ahmad\s+ibn\s+hanbal)[:\s]/i,
  ],
  all: [],
}

const MAJORITY_PATTERNS: RegExp[] = [
  /majority\s+(?:of\s+)?(?:the\s+)?(?:four\s+)?(?:sunni\s+)?(?:madhahib|scholars?|opinion)/i,
  /\bjumhur\b/i,
  /most\s+scholars\s+(?:agree|hold|consider)/i,
  /scholarly\s+consensus/i,
]

// ─── Extract madhhab stances from AI response text ──────────────────────────────

export function extractMadhabStances(text: string): MadhabStance[] {
  const stances: MadhabStance[] = []
  const hasMajority = MAJORITY_PATTERNS.some((p) => p.test(text))

  const madhahib: Exclude<MadhabTag, 'all'>[] = ['hanafi', 'maliki', 'shafii', 'hanbali']

  for (const madhhab of madhahib) {
    const patterns = MADHHAB_MARKERS[madhhab]
    let stanceText: string | null = null

    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match) {
        // Extract text after the marker until next double-newline or numbered section
        const start  = match.index + match[0].length
        const rest   = text.slice(start)
        const endIdx = rest.search(/\n\n|\n\d\.\s+[A-Z]|\n[A-Z][a-z]+ (?:stance|school|madhab)/m)
        const raw    = endIdx > 0 ? rest.slice(0, endIdx) : rest.slice(0, 400)
        stanceText   = raw.replace(/\n/g, ' ').trim().slice(0, 300)
        break
      }
    }

    if (stanceText) {
      // Check if this madhhab is called "majority"
      const isMajority = hasMajority && (
        MAJORITY_PATTERNS.some((p) => p.test(stanceText!)) ||
        (madhhab === 'hanbali' && /majority|jumhur/i.test(stanceText))
      )

      // Extract scholar citation from the stance text slice (empty string = uncited per Gate A)
      const sourceMatch = stanceText.match(
        /(?:according to|imam|sheikh|shaykh|ibn\s+\w+)\s+([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})/i,
      )
      const source = sourceMatch ? sourceMatch[1].trim() : ''

      stances.push({
        madhhab,
        stance:      stanceText,
        source,
        is_majority: isMajority,
      })
    }
  }

  return stances
}

// ─── Fiqh question detection (Haiku, cached 1h) ─────────────────────────────────

const FIQH_CACHE_TTL = 3600  // 1 hour

export async function detectFiqhQuestion(text: string): Promise<boolean> {
  const hash     = crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex')
  const cacheKey = `ci:fiqh:${hash}`

  // Check cache
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null) return cached === 'true'
    } catch { /* proceed */ }
  }

  // Haiku classification
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let result = false

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 10,
      system:     'Is this a fiqh (Islamic law) question? Reply only "true" or "false".',
      messages:   [{ role: 'user', content: text }],
    })
    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text.trim().toLowerCase())
      .join('')
    result = answer.startsWith('true')
  } catch { /* default false */ }

  // Cache result
  if (redis) {
    try {
      await redis.setex(cacheKey, FIQH_CACHE_TTL, String(result))
    } catch { /* non-blocking */ }
  }

  return result
}

// ─── System prompt addendum per user's preferred madhhab ─────────────────────────

const MADHHAB_ADDENDUMS: Record<Exclude<MadhabTag, 'all'>, string> = {
  hanafi:  "The user follows the Hanafi madhhab. Present the Hanafi position prominently. When mentioning other positions, briefly note them after the Hanafi view.",
  maliki:  "The user follows the Maliki madhhab. Present the Maliki position prominently. When mentioning other positions, briefly note them after the Maliki view.",
  shafii:  "The user follows the Shafi'i madhhab. Present the Shafi'i position prominently. When mentioning other positions, briefly note them after the Shafi'i view.",
  hanbali: "The user follows the Hanbali madhhab. Present the Hanbali position prominently. When mentioning other positions, briefly note them after the Hanbali view.",
}

export function buildMadhabSystemPromptAddendum(userMadhab: MadhabTag): string {
  if (userMadhab === 'all') return ''
  return MADHHAB_ADDENDUMS[userMadhab] ?? ''
}
