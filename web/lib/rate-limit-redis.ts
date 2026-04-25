/**
 * ChatIslam — Redis Rate Limit Adapter (Phase 3+)
 *
 * True sliding-window using a sorted set (ZRANGEBYSCORE / ZADD / ZREMRANGEBYSCORE).
 * Activates automatically when REDIS_URL is set — see factory in rate-limit.ts.
 *
 * Uses ioredis (already a dep of the nSelf Hasura stack).
 * Install: pnpm add ioredis
 *
 * Sliding window algorithm:
 *   - Key: sorted set where each member is a unique request ID
 *   - Score: request timestamp (epoch ms)
 *   - On each check:
 *       1. Remove entries older than now - windowMs
 *       2. Count remaining entries
 *       3. If count < limit: add new entry, return allowed
 *       4. Else: return denied with reset time = oldest entry + windowMs
 *   - TTL is set to windowMs + 5s to auto-expire the key
 */

import type { RateLimitAdapter, RateLimitOptions, RateLimitResult } from './rate-limit'

interface RedisClient {
  pipeline(): {
    zremrangebyscore(key: string, min: string | number, max: string | number): unknown
    zcard(key: string): unknown
    zrange(key: string, start: number, stop: number, withScores?: string): unknown
    zadd(key: string, score: number, member: string): unknown
    pexpire(key: string, ms: number): unknown
    exec(): Promise<Array<[Error | null, unknown]>>
  }
}

export class RedisRateLimitAdapter implements RateLimitAdapter {
  private redis: RedisClient

  constructor(redisUrl: string) {
    // ioredis is an optional dep — imported here so the module is tree-shaken
    // when REDIS_URL is not set and the factory uses the memory adapter instead.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis')
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    }) as RedisClient
  }

  async check(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - opts.windowMs
    const member = `${now}-${Math.random().toString(36).slice(2)}`

    const pipe = this.redis.pipeline()

    // 1. Remove entries outside the sliding window
    pipe.zremrangebyscore(key, '-inf', windowStart)
    // 2. Count current window entries
    pipe.zcard(key)
    // 3. Get oldest entry score (to compute reset time)
    pipe.zrange(key, 0, 0, 'WITHSCORES')

    const results = await pipe.exec()

    const count = (results[1][1] as number) ?? 0
    const oldestScores = (results[2][1] as string[]) ?? []
    const oldestTs = oldestScores.length >= 2 ? Number(oldestScores[1]) : now

    if (count >= opts.limit) {
      const resetAt = oldestTs + opts.windowMs
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      }
    }

    // 4. Allowed — add the new entry and set TTL
    const addPipe = this.redis.pipeline()
    addPipe.zadd(key, now, member)
    addPipe.pexpire(key, opts.windowMs + 5_000)
    await addPipe.exec()

    const resetAt = now + opts.windowMs
    return {
      allowed: true,
      remaining: opts.limit - (count + 1),
      resetAt,
      retryAfterSeconds: 0,
    }
  }
}
