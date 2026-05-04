/**
 * ChatIslam — POST /api/research (CB-01 T03)
 *
 * Feynman Research Agent endpoint.
 * Rate limits: 5/min scholarly, 20/min summary/intermediate (Redis sliding window)
 * Auth: optional (anon allowed; BYO key requires auth)
 * Feature flag: FF_FEYNMAN_AGENT
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { researchQuery, researchCacheKey, type FeynmanDepth, type ResearchResponse } from '../../../lib/feynman-agent'
import type { MadhabTag } from '../../../lib/madhhab'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchRequest {
  query:       string
  depth:       FeynmanDepth
  madhhab?:    MadhabTag
  language?:   'en' | 'ar' | 'id'
  session_id?: string
}

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

function parseUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  try {
    const token   = auth.slice(7)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const claims  = payload['https://hasura.io/jwt/claims'] ?? {}
    return claims['x-hasura-user-id'] ?? null
  } catch {
    return null
  }
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Feature flag gate
  if (process.env.FF_FEYNMAN_AGENT === 'false') {
    return NextResponse.json({ error: 'feature_disabled', redirect: '/chat' }, { status: 403 })
  }

  // Validate remote schema secret on Remote Schema path
  const remoteSchemaSecret = req.headers.get('x-remote-schema-secret')
  if (remoteSchemaSecret && remoteSchemaSecret !== process.env.REMOTE_SCHEMA_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: ResearchRequest
  try {
    body = (await req.json()) as ResearchRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate
  if (!body.query || typeof body.query !== 'string' || body.query.trim() === '') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }
  if (body.query.length > 500) {
    return NextResponse.json({ error: 'query exceeds 500 characters' }, { status: 400 })
  }
  const validDepths: FeynmanDepth[] = ['summary', 'intermediate', 'scholarly']
  if (!body.depth || !validDepths.includes(body.depth)) {
    return NextResponse.json({ error: 'depth must be summary|intermediate|scholarly' }, { status: 400 })
  }

  const userId = parseUserId(req)

  // Rate limiting — namespace ci:rl:research:* (does not collide with ci:rl:chat:*)
  const rlKey   = `ci:rl:research:${userId ?? req.headers.get('x-forwarded-for') ?? 'anon'}`
  const rlLimit = body.depth === 'scholarly' ? 5 : 20
  const rl      = await checkRateLimit(rlKey, rlLimit)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } },
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
        return NextResponse.json({ ...parsed, cached: true })
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
    return NextResponse.json({ error: 'research_failed', message: 'Research failed. Please try again.' }, { status: 500 })
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

  return NextResponse.json(result)
}
