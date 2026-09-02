/**
 * ChatIslam — GET /api/chat/sessions
 *
 * Returns the authenticated user's saved chat sessions (for ChatSidebar).
 * Requires auth. Feature flag: FF_CONVERSATION_HISTORY
 * Rate limit: 30/min per user
 *
 * Same-origin proxy so ChatSidebar never talks to Hasura directly with a
 * client-held token — it reads the httpOnly ci_access_token cookie
 * server-side instead (no-localstorage-token fix, ported from praycalc/web).
 */

import type { APIRoute } from 'astro'
import type { AstroCookies } from 'astro'
import { readAccessToken } from '@/lib/auth/cookies.server'
import { verifyHasuraUserId } from '../../../lib/auth/verify-jwt'

export const prerender = false

// ─── Redis rate limiter ───────────────────────────────────────────────────────

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
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

async function checkRateLimit(key: string): Promise<{ allowed: boolean }> {
  const redis = getRedis()
  if (!redis) return { allowed: true }
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)
    return { allowed: count <= 30 }
  } catch {
    return { allowed: true }
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Reads the access token from the httpOnly ci_access_token cookie (set by
// /api/auth/signin|signup|refresh) instead of an Authorization header — the
// client never holds the raw token (no-localstorage-token fix). Decode logic
// is unchanged: base64url-decode the JWT payload and pull the Hasura claim.
// NOTE: no signature verification here — tracked as a separate follow-up.
// Signature-verified. Previously this base64url-decoded the JWT payload and
// trusted the Hasura claim without calling jwtVerify(), so a forged token in
// the access-token cookie could claim any x-hasura-user-id. Decoding now goes
// through the shared helper instead of being reimplemented per route.
async function parseUserId(cookies: AstroCookies): Promise<string | null> {
  return verifyHasuraUserId(readAccessToken(cookies))
}

// ─── Hasura admin client ──────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

interface ChatSessionRow {
  id:              string
  title:           string | null
  last_message_at: string | null
  audience_mode:   string | null
  messages_aggregate: { aggregate: { count: number } }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ cookies }) => {
  // Feature flag
  if (process.env.FF_CONVERSATION_HISTORY === 'false') {
    return new Response(JSON.stringify({ error: 'feature_disabled' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  // Auth required
  const userId = await parseUserId(cookies)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'auth_required' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // Rate limit
  const rlKey = `ci:rl:chat:sessions:${userId}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } })
  }

  if (!HASURA_ENDPOINT) {
    return new Response(JSON.stringify({ error: 'backend_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query($user_id: uuid!) {
            ci_sessions(
              where:    { user_id: { _eq: $user_id } }
              order_by: { last_message_at: desc_nulls_last }
              limit:    50
            ) {
              id title last_message_at audience_mode
              messages_aggregate { aggregate { count } }
            }
          }`,
        variables: { user_id: userId },
      }),
      signal: AbortSignal.timeout(5000),
    })

    const data = await res.json() as {
      data?: { ci_sessions: ChatSessionRow[] }
      errors?: Array<{ message: string }>
    }

    if (data.errors?.length) throw new Error(data.errors[0].message)

    const sessions = (data.data?.ci_sessions ?? []).map((s) => ({
      id:              s.id,
      title:           s.title,
      last_message_at: s.last_message_at,
      message_count:   s.messages_aggregate.aggregate.count,
      audience_mode:   s.audience_mode,
    }))

    return new Response(JSON.stringify({ sessions }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[chat/sessions] error', err)
    return new Response(JSON.stringify({ error: 'sessions_fetch_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
