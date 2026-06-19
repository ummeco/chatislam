/**
 * ChatIslam — Next.js Edge Middleware
 *
 * Rate limits /api/chat/* and /api/escalate/* before they reach handler code.
 * Protects against bot abuse and unbounded Anthropic API cost.
 *
 * Phase 1: in-memory adapter (single-instance, dev/staging safe).
 * Phase 3: set REDIS_URL env var — factory auto-swaps to RedisRateLimitAdapter.
 *
 * Limits (per spec):
 *   Anonymous (IP):      5 req/min
 *   Authenticated user: 30 req/min
 *   API token:         100 req/min
 *
 * NOTE: Edge runtime cannot import Node.js modules. This file must stay
 * edge-compatible. The adapter factory uses require() lazily so ioredis
 * is only loaded in Node.js environments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import {
  checkRateLimit,
  getClientIp,
  ANON_PER_MINUTE,
  AUTH_PER_MINUTE,
  TOKEN_PER_MINUTE,
} from './lib/rate-limit'

// HS256 signing key for Hasura-issued JWTs (raw key form, matching the route handlers).
const JWT_SECRET = process.env.HASURA_JWT_SECRET

// Apply rate limiting only to AI routes — not GraphQL / auth / static assets
export const config = {
  matcher: ['/api/chat/:path*', '/api/escalate/:path*'],
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)

  // Extract auth context from headers
  const authHeader = req.headers.get('authorization') ?? ''
  const apiKey = req.headers.get('x-api-key') ?? ''

  // API token takes precedence over user JWT
  if (apiKey) {
    const result = await checkRateLimit(`token:min:${apiKey}`, TOKEN_PER_MINUTE)
    if (!result.allowed) {
      return rateLimitResponse(result.retryAfterSeconds, 'API token rate limit exceeded')
    }
    return nextWithHeaders(result.remaining, result.resetAt)
  }

  const userId = await extractUserIdFromJwt(authHeader)
  const isAuth = !!userId

  // Per-minute check — keyed by userId if authed, IP if anon
  const minuteKey = isAuth ? `auth:min:${userId}` : `anon:min:${ip}`
  const minuteConfig = isAuth ? AUTH_PER_MINUTE : ANON_PER_MINUTE
  const minuteResult = await checkRateLimit(minuteKey, minuteConfig)

  if (!minuteResult.allowed) {
    return rateLimitResponse(
      minuteResult.retryAfterSeconds,
      isAuth
        ? 'Rate limit exceeded — please slow down'
        : 'Rate limit exceeded — sign in for a higher limit',
    )
  }

  return nextWithHeaders(minuteResult.remaining, minuteResult.resetAt)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextWithHeaders(remaining: number, resetAt: number): NextResponse {
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
  return response
}

function rateLimitResponse(retryAfterSeconds: number, message: string): NextResponse {
  return NextResponse.json(
    {
      error: 'rate_limited',
      message,
      retry_after: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'Content-Type': 'application/json',
      },
    },
  )
}

/**
 * Extract the user ID from a Bearer JWT AFTER verifying its HS256 signature.
 * jose runs in the Edge runtime via Web Crypto, so signature verification is
 * available here (the prior atob-only decode trusted a forgeable `sub`). On any
 * verification failure — bad signature, wrong algorithm, expiry, missing secret —
 * we return null so the request falls back to the anonymous rate-limit bucket and
 * a forged token can never select another user's authenticated bucket. Full
 * authorization still happens in the route handler.
 */
async function extractUserIdFromJwt(authHeader: string): Promise<string | null> {
  if (!authHeader.startsWith('Bearer ') || !JWT_SECRET) return null
  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
      { algorithms: ['HS256'] },
    )
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
