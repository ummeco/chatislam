/**
 * ChatIslam — GET /api/citation (CB-06 T39)
 *
 * Verify an islam.wiki citation URL exists.
 * Only accepts URLs from the islam.wiki domain.
 * Checks ci_citation_overrides first, then verifies the (possibly redirected) URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCitationUrl, checkOverride } from '../../../lib/citation'

// ─── Rate limiter ─────────────────────────────────────────────────────────────

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url') ?? ''

  // Validate: must be https://islam.wiki/* domain only
  const islamWikiBase = process.env.ISLAMWIKI_BASE_URL ?? 'https://islam.wiki'
  if (!rawUrl || !rawUrl.startsWith(islamWikiBase + '/')) {
    return NextResponse.json(
      { error: 'url must be an islam.wiki URL' },
      { status: 400 },
    )
  }

  // Rate limit: 60/min; public
  const ip    = req.headers.get('x-forwarded-for') ?? 'anon'
  const rlKey = `ci:rl:citation:${ip}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  // Check override first
  const override = await checkOverride(rawUrl)
  const urlToVerify = override ?? rawUrl

  // Verify URL
  const { exists, title } = await verifyCitationUrl(urlToVerify)

  return NextResponse.json({
    exists,
    title,
    ...(override ? { redirect_url: override } : {}),
  })
}
