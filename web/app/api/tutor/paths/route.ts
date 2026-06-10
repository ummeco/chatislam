/**
 * ChatIslam — GET /api/tutor/paths (CB-03 T18)
 *
 * Returns all active ci_tutor_paths with lesson count.
 * Public — no auth required.
 * Rate limit: 60/min
 * Cache: 1h (ci:tutor:paths)
 * Feature flag: FF_AI_TUTOR
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Redis ────────────────────────────────────────────────────────────────────

interface RedisLike {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
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
    return { allowed: count <= 60 }
  } catch {
    return { allowed: true }
  }
}

// ─── Hasura admin ─────────────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

interface TutorPath {
  id:          string
  slug:        string
  title:       string
  description: string
  audience:    string
  level:       string
  is_active:   boolean
  sort_order:  number
  created_at:  string
  lessons_aggregate: { aggregate: { count: number } }
}

async function fetchPaths(): Promise<TutorPath[]> {
  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: `
        query GetTutorPaths {
          ci_tutor_paths(
            where:    { is_active: { _eq: true } }
            order_by: { sort_order: asc }
          ) {
            id
            slug
            title
            description
            audience
            level
            is_active
            sort_order
            created_at
            lessons_aggregate {
              aggregate { count }
            }
          }
        }`,
    }),
    signal: AbortSignal.timeout(5000),
  })
  const data = await res.json() as {
    data?: { ci_tutor_paths?: TutorPath[] }
    errors?: unknown
  }
  if (data.errors) throw new Error('Hasura error fetching tutor paths')
  return data.data?.ci_tutor_paths ?? []
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Feature flag
  if (process.env.FF_AI_TUTOR === 'false') {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 403 })
  }

  // Rate limit
  const ip    = req.headers.get('x-forwarded-for') ?? 'anon'
  const rlKey = `ci:rl:tutor:paths:${ip}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const CACHE_KEY = 'ci:tutor:paths'
  const CACHE_TTL = 3600  // 1h

  // Cache check
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        return NextResponse.json(
          JSON.parse(cached) as object,
          { headers: { 'X-Cache': 'HIT' } },
        )
      }
    } catch { /* proceed */ }
  }

  // Fetch from Hasura
  if (!HASURA_ENDPOINT) {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503 })
  }

  let paths: TutorPath[]
  try {
    paths = await fetchPaths()
  } catch (err) {
    console.error('[tutor/paths] Hasura error', err)
    return NextResponse.json({ error: 'failed_to_fetch_paths' }, { status: 500 })
  }

  const response = {
    paths: paths.map((p) => ({
      id:            p.id,
      slug:          p.slug,
      title:         p.title,
      description:   p.description,
      audience:      p.audience,
      level:         p.level,
      sort_order:    p.sort_order,
      lesson_count:  p.lessons_aggregate.aggregate.count,
    })),
  }

  // Cache result
  if (redis) {
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response))
    } catch { /* non-blocking */ }
  }

  return NextResponse.json(response, { headers: { 'X-Cache': 'MISS' } })
}
