/**
 * ChatIslam — /api/feedback POST handler (T04-P9)
 *
 * Accepts user thumbs-up/down ratings and optional correction text for AI responses.
 * Satisfies the privacy policy declaration: "ratings or corrections you submit are collected."
 *
 * Astro SSR port of the former Next.js App-Router route (structural only —
 * business logic unchanged).
 *
 * Auth: public (anonymous allowed; session_id required in body)
 * Rate limit: 10 feedback submissions per session per hour (Redis key: ci:fb:{session_id})
 * PII: correction_text is PII-scrubbed via sentry-scrub patterns before persisting
 *
 * Request body:
 *   { message_id: string, session_id: string, rating: -1 | 1,
 *     correction_text?: string, flagged_reason?: string }
 *
 * Responses:
 *   200 { success: true }
 *   400 { error: string }   — validation failure
 *   429 { error: 'rate_limited', retry_after: number }
 *   500 { error: 'internal' }
 */

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { jwtVerify } from 'jose'
import { sanitizeUserInput }          from '../../../lib/sanitize-input'

export const prerender = false

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FeedbackSchema = z.object({
  message_id:      z.string().regex(UUID_PATTERN),
  session_id:      z.string().regex(UUID_PATTERN),
  rating:          z.union([z.literal(-1), z.literal(1)]),
  correction_text: z.string().max(500).optional(),
  flagged_reason:  z.enum(['incorrect', 'inappropriate', 'off_topic']).optional(),
})

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CORRECTION_LENGTH = 500
const RATE_LIMIT_PER_HOUR   = 10
const RATE_LIMIT_WINDOW_S   = 3600

// ─── Redis rate limiter (optional — falls back gracefully when REDIS_URL absent) ─

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
}

let _feedbackRedis: RedisLike | null = null

function getFeedbackRedis(): RedisLike | null {
  if (_feedbackRedis) return _feedbackRedis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const { Redis } = require('ioredis') as { Redis: new (u: string) => RedisLike }
    _feedbackRedis = new Redis(url)
    return _feedbackRedis
  } catch {
    return null
  }
}

async function checkFeedbackRateLimit(sessionId: string): Promise<{
  allowed:    boolean
  retryAfter: number
}> {
  const redis = getFeedbackRedis()
  if (!redis) return { allowed: true, retryAfter: 0 }  // graceful: allow when no Redis

  const key = `ci:fb:${sessionId}`
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_S)
    if (count > RATE_LIMIT_PER_HOUR) {
      const ttl = await redis.ttl(key)
      return { allowed: false, retryAfter: Math.max(ttl, 0) }
    }
    return { allowed: true, retryAfter: 0 }
  } catch {
    return { allowed: true, retryAfter: 0 }  // graceful: allow on Redis error
  }
}

// ─── PII scrub for correction text ───────────────────────────────────────────

/**
 * Strip patterns that may contain PII from correction_text before persisting.
 * Piggybacks on the sentry-scrub module's PII patterns.
 */
function scrubPii(text: string): string {
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[email]')
    // Phone numbers (international + US)
    .replace(/\+?[\d\s\-().]{10,}/g, '[phone]')
    // SSN
    .replace(/\d{3}[-\s]?\d{2}[-\s]?\d{4}/g, '[ssn]')
}

// ─── Hasura mutation ──────────────────────────────────────────────────────────

const INSERT_FEEDBACK = `
  mutation InsertMessageFeedback($object: ci_message_feedback_insert_input!) {
    insert_ci_message_feedback_one(object: $object) {
      id
    }
  }
`

async function persistFeedback(payload: {
  message_id:      string
  session_id:      string
  user_id:         string | null
  rating:          number
  correction_text: string | null
  flagged_reason:  string | null
}): Promise<void> {
  const endpoint = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
  const secret   = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''
  if (!endpoint) return

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': secret,
    },
    body:   JSON.stringify({ query: INSERT_FEEDBACK, variables: { object: payload } }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Hasura feedback insert failed ${res.status}: ${body}`)
  }

  const data = await res.json() as { errors?: Array<{ message: string }> }
  if (data.errors?.length) {
    throw new Error(`Hasura GraphQL error: ${data.errors[0]?.message}`)
  }
}

// ─── UUID validator ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(v: string): boolean {
  return UUID_RE.test(v)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.json().catch(() => null)
  const parsed = FeedbackSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { message_id, session_id, rating, correction_text, flagged_reason } = parsed.data

  // ── Sanitize optional text fields ──
  const sanitizedCorrection: string | null =
    correction_text !== undefined
      ? scrubPii(sanitizeUserInput(correction_text))
      : null
  const sanitizedReason: string | null = flagged_reason ?? null

  // ── Rate limit ──
  const rl = await checkFeedbackRateLimit(session_id)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', retry_after: rl.retryAfter }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // ── Extract user_id from verified JWT (best-effort — not required for feedback) ──
  let userId: string | null = null
  try {
    const authHeader = request.headers.get('authorization') ?? ''
    const jwtSecret = process.env.HASURA_JWT_SECRET
    if (authHeader.startsWith('Bearer ') && jwtSecret) {
      const token  = authHeader.slice(7)
      const secret = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
      const claims = (payload as Record<string, unknown>)['https://hasura.io/jwt/claims'] as Record<string, unknown> | undefined ?? {}
      userId = (claims['x-hasura-user-id'] as string | undefined) ?? (payload.sub as string | undefined) ?? null
    }
  } catch { /* non-blocking — feedback can be anonymous */ }

  // ── Persist ──
  try {
    await persistFeedback({
      message_id:      message_id,
      session_id:      session_id,
      user_id:         userId,
      rating:          rating as number,
      correction_text: sanitizedCorrection,
      flagged_reason:  sanitizedReason,
    })
  } catch (err) {
    console.error('[api/feedback] persist error:', err)
    return new Response(JSON.stringify({ error: 'internal' }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
}
