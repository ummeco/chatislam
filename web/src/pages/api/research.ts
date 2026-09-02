/**
 * src/pages/api/research.ts — Astro SSR API endpoint — POST /api/research (CB-01 T03)
 *
 * Feynman Research Agent endpoint.
 * Rate limits: 5/min scholarly, 20/min summary/intermediate (Redis sliding window)
 * Auth: optional (anon allowed; BYO key requires auth)
 * Feature flag: FF_FEYNMAN_AGENT
 *
 * Structural port of app/api/research/route.ts to Astro SSR (logic identical).
 */

import type { APIRoute } from 'astro'
import type { AstroCookies } from 'astro'
import crypto from 'crypto'
import { z } from 'zod'
import { researchQuery, researchCacheKey, type FeynmanDepth, type ResearchResponse } from '../../../lib/feynman-agent'
import type { MadhabTag } from '../../../lib/madhhab'
import { readAccessToken } from '@/lib/auth/cookies.server'
import { verifyHasuraUserId } from '../../lib/auth/verify-jwt'

export const prerender = false

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchRequest {
  query:       string
  depth:       FeynmanDepth
  madhhab?:    MadhabTag
  language?:   'en' | 'ar' | 'id'
  session_id?: string
}

// Zod schema — T03 AC-01: Priority 2 validation at research boundary
const ResearchRequestSchema = z.object({
  query:      z.string().min(1, 'query is required').max(500),
  depth:      z.enum(['summary', 'intermediate', 'scholarly']),
  madhhab:    z.string().optional(),
  language:   z.enum(['en', 'ar', 'id']).optional(),
  session_id: z.string().optional(),
})

// ─── Redis rate limiter ───────────────────────────────────────────────────────

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>
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

async function checkRateLimit(key: string, limit: number): Promise<{ allowed: boolean }> {
  const redis = getRedis()
  if (!redis) return { allowed: true }  // fail open if Redis unavailable
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)
    return { allowed: count <= limit }
  } catch {
    return { allowed: true }  // fail open
  }
}

// ─── Session parsing ──────────────────────────────────────────────────────────

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

// ─── Hasura admin client (server-only) ───────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

async function persistResearchQuery(args: {
  userId:          string | null
  queryText:       string
  queryHash:       string
  depth:           FeynmanDepth
  response:        string
  citations:       unknown
  madhhab_analysis?: unknown
  isnads?:         unknown
  language:        string
  cacheTtlHours:   number
}): Promise<void> {
  if (!HASURA_ENDPOINT) return
  const cacheTtl = new Date(Date.now() + args.cacheTtlHours * 3600_000).toISOString()
  try {
    await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          mutation InsertResearchQuery($obj: ci_research_queries_insert_input!) {
            insert_ci_research_queries_one(object: $obj) { id }
          }`,
        variables: {
          obj: {
            user_id:          args.userId,
            query_text:       args.queryText,
            query_hash:       args.queryHash,
            depth:            args.depth,
            response:         args.response,
            citations:        args.citations,
            madhhab_analysis: args.madhhab_analysis ?? null,
            isnads:           args.isnads ?? null,
            language:         args.language,
            cache_ttl:        cacheTtl,
          },
        },
      }),
    })
  } catch { /* non-blocking */ }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request, cookies }) => {
  // Feature flag gate
  if (process.env.FF_FEYNMAN_AGENT === 'false') {
    return new Response(JSON.stringify({ error: 'feature_disabled', redirect: '/chat' }), {
      status:  403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate remote schema secret on Remote Schema path
  const remoteSchemaSecret = request.headers.get('x-remote-schema-secret')
  if (remoteSchemaSecret && remoteSchemaSecret !== process.env.REMOTE_SCHEMA_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse body — Zod safeParse (T03 AC-01)
  const rawBody = await request.json().catch(() => null)
  const parsedBody = ResearchRequestSchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_input', details: parsedBody.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const body: ResearchRequest = parsedBody.data as ResearchRequest

  const userId = await parseUserId(cookies)

  // Rate limiting — namespace ci:rl:research:* (does not collide with ci:rl:chat:*)
  const rlKey   = `ci:rl:research:${userId ?? request.headers.get('x-forwarded-for') ?? 'anon'}`
  const rlLimit = body.depth === 'scholarly' ? 5 : 20
  const rl      = await checkRateLimit(rlKey, rlLimit)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    )
  }

  // Cache check before calling feynman-agent
  const language = body.language ?? 'en'
  const cacheKey = researchCacheKey(body.query, body.depth, language)
  const redis    = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as ResearchResponse
        return new Response(JSON.stringify({ ...parsed, cached: true }), {
          status:  200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch { /* proceed */ }
  }

  // Call feynman-agent
  let result: ResearchResponse
  try {
    result = await researchQuery(body.query, body.depth, {
      madhhab:    body.madhhab,
      language:   body.language,
      session_id: body.session_id,
    })
  } catch (err) {
    console.error('[research/route] feynman-agent error', err)
    return new Response(
      JSON.stringify({ error: 'research_failed', message: 'Research failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Persist to DB (non-blocking)
  const cacheTtlHours = Number(process.env.FEYNMAN_CACHE_TTL_HOURS ?? '24')
  const queryHash     = crypto.createHash('sha256').update(body.query.toLowerCase().trim()).digest('hex')
  void persistResearchQuery({
    userId,
    queryText:       body.query,
    queryHash,
    depth:           body.depth,
    response:        result.result,
    citations:       result.citations,
    madhhab_analysis: result.madhhab_analysis,
    isnads:          result.isnads,
    language,
    cacheTtlHours,
  })

  return new Response(JSON.stringify(result), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
}
