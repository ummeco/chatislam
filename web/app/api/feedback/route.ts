/**
 * ChatIslam — /api/feedback POST handler (T04-P9)
 *
 * Accepts user thumbs-up/down ratings and optional correction text for AI responses.
 * Satisfies the privacy policy declaration: "ratings or corrections you submit are collected."
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

import { NextRequest, NextResponse } from 'next/server'
import { sanitizeUserInput }          from '../../../lib/sanitize-input'

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // ── Validation ──
  const { message_id, session_id, rating, correction_text, flagged_reason } = b

  if (typeof message_id !== 'string' || !isUuid(message_id)) {
    return NextResponse.json({ error: 'message_id must be a valid UUID' }, { status: 400 })
  }

  if (typeof session_id !== 'string' || !isUuid(session_id)) {
    return NextResponse.json({ error: 'session_id must be a valid UUID' }, { status: 400 })
  }

  if (rating !== -1 && rating !== 1) {
    return NextResponse.json({ error: 'rating must be -1 or 1' }, { status: 400 })
  }

  let sanitizedCorrection: string | null = null
  if (correction_text !== undefined) {
    if (typeof correction_text !== 'string') {
      return NextResponse.json({ error: 'correction_text must be a string' }, { status: 400 })
    }
    if (correction_text.length > MAX_CORRECTION_LENGTH) {
      return NextResponse.json(
        { error: `correction_text must be ≤ ${MAX_CORRECTION_LENGTH} characters` },
        { status: 400 },
      )
    }
    sanitizedCorrection = scrubPii(sanitizeUserInput(correction_text))
  }

  const VALID_REASONS = ['incorrect', 'inappropriate', 'off_topic']
  let sanitizedReason: string | null = null
  if (flagged_reason !== undefined) {
    if (typeof flagged_reason !== 'string' || !VALID_REASONS.includes(flagged_reason)) {
      return NextResponse.json(
        { error: `flagged_reason must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 },
      )
    }
    sanitizedReason = flagged_reason
  }

  // ── Rate limit ──
  const rl = await checkFeedbackRateLimit(session_id)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // ── Extract user_id from JWT (best-effort — not required) ──
  let userId: string | null = null
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token   = authHeader.slice(7)
      const payload = token.split('.')[1]
      if (payload) {
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        const claims  = decoded as { sub?: string }
        userId        = claims.sub ?? null
      }
    }
  } catch { /* non-blocking */ }

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
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
