/**
 * ChatIslam — GET /api/research/cached (CB-01 T04)
 *
 * Check Redis cache for a research query without calling feynman-agent.
 * Returns { cached: boolean, result?: ResearchResponse, age_seconds?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { researchCacheKey, type FeynmanDepth, type ResearchResponse } from '../../../../lib/feynman-agent'

// ─── Redis ────────────────────────────────────────────────────────────────────

interface RedisLike {
  get(key: string): Promise<string | null>
  ttl(key: string): Promise<number>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
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

// ─── Rate limiter ─────────────────────────────────────────────────────────────

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

// ─── DELETE handler — clear a cached result ───────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const q     = searchParams.get('q') ?? ''
  const depth = (searchParams.get('depth') ?? 'summary') as FeynmanDepth
  const lang  = searchParams.get('lang') ?? 'en'

  if (!q) return NextResponse.json({ error: 'q param required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ deleted: false })

  const cacheKey = researchCacheKey(q, depth, lang)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (redis as any).del(cacheKey)
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ deleted: false })
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const q     = searchParams.get('q') ?? ''
  const depth = (searchParams.get('depth') ?? 'summary') as FeynmanDepth
  const lang  = searchParams.get('lang') ?? 'en'

  // Rate limit: 30/min
  const ip    = req.headers.get('x-forwarded-for') ?? 'anon'
  const rlKey = `ci:rl:research:cached:${ip}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  if (!q) {
    return NextResponse.json({ cached: false })
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ cached: false })
  }

  const cacheKey = researchCacheKey(q, depth, lang)
  const cacheTtlHours = Number(process.env.FEYNMAN_CACHE_TTL_HOURS ?? '24')

  try {
    const [stored, ttlRemaining] = await Promise.all([
      redis.get(cacheKey),
      redis.ttl(cacheKey),
    ])

    if (!stored) {
      return NextResponse.json({ cached: false })
    }

    const parsed = JSON.parse(stored) as ResearchResponse
    const totalTtlSeconds = cacheTtlHours * 3600
    const ageSeconds      = Math.max(0, totalTtlSeconds - ttlRemaining)

    return NextResponse.json(
      {
        cached:      true,
        result:      { ...parsed, cached: true },
        age_seconds: ageSeconds,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    )
  } catch {
    return NextResponse.json({ cached: false })
  }
}
