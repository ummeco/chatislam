/**
 * ChatIslam — GET /api/seasonal/status (CB-05 T34a)
 *
 * Returns the current Islamic seasonal mode status from ci_seasonal_config.
 * Falls back to computing from Hijri calendar if no DB record found.
 * Feature flag: FF_SEASONAL_MODE
 * Rate limit: 60/min (public, no auth)
 * Cache: 30min (ci:seasonal:status)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSeasonalMode, computeDaysRemaining, type SeasonalMode } from '../../../../lib/seasonal'

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

// ─── Hasura ───────────────────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

interface SeasonalConfigRow {
  mode:         string
  is_active:    boolean
  activated_at: string | null
  deactivated_at: string | null
}

async function fetchActiveSeasonalConfig(): Promise<SeasonalConfigRow | null> {
  if (!HASURA_ENDPOINT) return null
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query {
            ci_seasonal_config(
              where:    { is_active: { _eq: true } }
              order_by: { activated_at: desc_nulls_last }
              limit:    1
            ) {
              mode is_active activated_at deactivated_at
            }
          }`,
      }),
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json() as {
      data?: { ci_seasonal_config: SeasonalConfigRow[] }
    }
    return data.data?.ci_seasonal_config?.[0] ?? null
  } catch {
    return null
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Feature flag
  if (process.env.FF_SEASONAL_MODE === 'false') {
    return NextResponse.json({ active: false, mode: null, days_remaining: null, activated_at: null })
  }

  // Rate limit
  const ip    = req.headers.get('x-forwarded-for') ?? 'anon'
  const rlKey = `ci:rl:seasonal:${ip}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const CACHE_KEY = 'ci:seasonal:status'
  const CACHE_TTL = 1800  // 30min

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

  // Check DB first (authoritative — cron manages is_active)
  const dbConfig = await fetchActiveSeasonalConfig()

  let response: {
    active:         boolean
    mode:           SeasonalMode | null
    days_remaining: number | null
    activated_at:   string | null
    source:         'db' | 'computed'
  }

  if (dbConfig) {
    const mode = dbConfig.mode as SeasonalMode
    response = {
      active:         dbConfig.is_active,
      mode:           dbConfig.is_active ? mode : null,
      days_remaining: dbConfig.is_active ? computeDaysRemaining(mode) : null,
      activated_at:   dbConfig.activated_at,
      source:         'db',
    }
  } else {
    // Fallback: compute from Hijri calendar
    const mode = await getCurrentSeasonalMode()
    response = {
      active:         mode !== null,
      mode,
      days_remaining: mode ? computeDaysRemaining(mode) : null,
      activated_at:   null,
      source:         'computed',
    }
  }

  // Cache result
  if (redis) {
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response))
    } catch { /* non-blocking */ }
  }

  return NextResponse.json(response, { headers: { 'X-Cache': 'MISS' } })
}
