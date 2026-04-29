/**
 * ChatIslam — Server-side Redis Rate Limiter (Node.js only)
 *
 * T0-04-01: per-user (10 req/min) and per-IP-anonymous (5 req/min) rate limits,
 * Redis-backed so they persist across restarts and across replicas.
 *
 * Failure mode: FAIL-CLOSED — if Redis is unreachable, requests are DENIED with 429.
 * This is intentional (per T0-15-01): a Redis outage should not open a free path
 * to the Anthropic API and incur unbounded cost.
 *
 * Algorithm: sliding window via Redis sorted sets (same as rate-limit-redis.ts).
 *
 * Env vars:
 *   REDIS_URL                              — required; ioredis connection string
 *   RATE_LIMIT_USER_PER_MIN                — authenticated user limit (default: 10)
 *   RATE_LIMIT_ANON_IP_PER_MIN             — anonymous IP limit (default: 5)
 *   RATE_LIMIT_ANTHROPIC_GLOBAL_USD_DAILY  — global spend cap USD/day (default: 50)
 */

import * as Sentry from '@sentry/nextjs'

export interface PerRequestRateLimitResult {
  /** Whether the request is allowed to proceed */
  allowed: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Epoch ms when this window resets */
  resetAt: number
  /** Seconds to wait before retrying (0 if allowed) */
  retryAfterSeconds: number
  /**
   * true = Redis was unreachable.
   * When redisError is true, allowed is always false (fail-CLOSED).
   */
  redisError?: boolean
}

// ---------------------------------------------------------------------------
// Redis client singleton (ioredis, Node.js only)
// ---------------------------------------------------------------------------

interface IORedisPipeline {
  zremrangebyscore(key: string, min: string | number, max: string | number): this
  zcard(key: string): this
  zrange(key: string, start: number, stop: number, withScores?: string): this
  zadd(key: string, score: number, member: string): this
  pexpire(key: string, ms: number): this
  exec(): Promise<Array<[Error | null, unknown]>>
}

interface IORedisClient {
  pipeline(): IORedisPipeline
  status: string
}

let _redisClient: IORedisClient | null = null
let _redisError: Error | null = null

/**
 * Get or initialise the ioredis client.
 * Returns null if REDIS_URL is not set.
 * Throws if ioredis cannot be imported (should never happen — it's in deps).
 */
export function getServerRedis(): IORedisClient | null {
  if (_redisError) return null
  if (_redisClient) return _redisClient

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require('ioredis') as { Redis: new (url: string, opts: object) => IORedisClient }
    _redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,  // fail fast
      enableOfflineQueue:   false,
      lazyConnect:          true,
      connectTimeout:       2_000,
    })
    return _redisClient
  } catch (err) {
    _redisError = err instanceof Error ? err : new Error(String(err))
    return null
  }
}

/**
 * Reset singleton (used in tests only).
 */
export function _resetServerRedis(): void {
  _redisClient = null
  _redisError  = null
}

// ---------------------------------------------------------------------------
// Sliding-window check
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000  // 1 minute

/**
 * Sliding-window rate limit check via Redis sorted sets.
 *
 * Fail-CLOSED: if Redis is unavailable or REDIS_URL is not set,
 * returns { allowed: false, redisError: true }.
 */
export async function checkServerRateLimit(
  key:   string,
  limit: number,
): Promise<PerRequestRateLimitResult> {
  const redis = getServerRedis()

  // No Redis configured or init failed — fail CLOSED
  if (!redis) {
    return {
      allowed:           false,
      remaining:         0,
      resetAt:           Date.now() + WINDOW_MS,
      retryAfterSeconds: 60,
      redisError:        true,
    }
  }

  const now         = Date.now()
  const windowStart = now - WINDOW_MS
  const member      = `${now}-${Math.random().toString(36).slice(2)}`

  try {
    // Read phase: remove stale, count current, get oldest
    const readPipe = redis.pipeline()
    readPipe.zremrangebyscore(key, '-inf', windowStart)
    readPipe.zcard(key)
    readPipe.zrange(key, 0, 0, 'WITHSCORES')
    const results = await readPipe.exec()

    // If any pipeline command returned an error, fail CLOSED
    for (const [err] of results) {
      if (err) {
        Sentry.captureException(err)
        console.error('[rate-limit-server] Redis pipeline error', err)
        return {
          allowed:           false,
          remaining:         0,
          resetAt:           now + WINDOW_MS,
          retryAfterSeconds: 60,
          redisError:        true,
        }
      }
    }

    const count        = (results[1][1] as number) ?? 0
    const oldestScores = (results[2][1] as string[]) ?? []
    const oldestTs     = oldestScores.length >= 2 ? Number(oldestScores[1]) : now

    if (count >= limit) {
      const resetAt = oldestTs + WINDOW_MS
      return {
        allowed:           false,
        remaining:         0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      }
    }

    // Write phase: add request, set TTL
    const writePipe = redis.pipeline()
    writePipe.zadd(key, now, member)
    writePipe.pexpire(key, WINDOW_MS + 5_000)
    await writePipe.exec()

    return {
      allowed:           true,
      remaining:         limit - (count + 1),
      resetAt:           now + WINDOW_MS,
      retryAfterSeconds: 0,
    }
  } catch (err) {
    // Network error, ECONNREFUSED, timeout — fail CLOSED
    Sentry.captureException(err)
    console.error('[rate-limit-server] Redis unreachable — failing CLOSED', {
      error: err instanceof Error ? err.message : String(err),
      key,
    })
    return {
      allowed:           false,
      remaining:         0,
      resetAt:           now + WINDOW_MS,
      retryAfterSeconds: 60,
      redisError:        true,
    }
  }
}

// ---------------------------------------------------------------------------
// Limit constants (env-configurable with spec defaults)
// ---------------------------------------------------------------------------

/** Per-user per-minute limit for authenticated users. Default: 10. */
export function getUserPerMinLimit(): number {
  const raw = process.env.RATE_LIMIT_USER_PER_MIN
  const n   = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 10
}

/** Per-IP per-minute limit for anonymous users. Default: 5. */
export function getAnonIpPerMinLimit(): number {
  const raw = process.env.RATE_LIMIT_ANON_IP_PER_MIN
  const n   = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 5
}

/**
 * Build the Redis key for per-user rate limiting.
 * Prefixed with `ci:rl:user:` to avoid collision with quota keys.
 */
export function userRateLimitKey(userId: string): string {
  return `ci:rl:user:${userId}:min`
}

/**
 * Build the Redis key for per-IP anonymous rate limiting.
 * Uses a pre-hashed IP (SHA-256 hex) — callers must hash before passing.
 */
export function anonIpRateLimitKey(ipHash: string): string {
  return `ci:rl:anon:${ipHash}:min`
}
