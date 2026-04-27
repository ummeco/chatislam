/**
 * ChatIslam — Daily query quota gate
 * Sprint 10 — T1-10-02
 *
 * Free tier:  3 queries/day per IP (anonymous) or per user_id (authenticated)
 * Plus tier:  unlimited (subject only to platform-wide Anthropic spend cap)
 *
 * State is stored in Redis with a key that resets at UTC midnight.
 * On the 4th free-tier query: returns { allowed: false, reason: 'quota_exceeded' }
 * so the API route can return 402 Payment Required + upgrade banner.
 *
 * Fail-open: if Redis is unavailable, gate returns allowed=true to preserve UX.
 * A structured warning is logged on every Redis error so ops can detect outages.
 *
 * Dependencies:
 *   - Sprint 17: this gate is imported by the /api/chat route which also calls
 *     the Anthropic wrapper. Sprint 17 wires the audience mode system; this file
 *     is standalone and has no Sprint 17 imports.
 *   - TB11-05 spend guard enforces the platform-wide Anthropic daily cost cap
 *     independently (handled in anthropic-wrapper.ts).
 */

export const FREE_TIER_DAILY_LIMIT = 3

export interface QueryGateResult {
  allowed:         boolean
  queriesUsed:     number
  queriesLimit:    number | null  // null = unlimited (plus tier)
  planTier:        'free' | 'plus'
  reason?:         'quota_exceeded' | 'redis_error'
}

export interface QueryGateOptions {
  /** Redis client — must support get/set/incr/expire commands. */
  redis:     RedisLike
  /** SHA-256 hex hash of the client IP. Callers must hash before passing. */
  ipHash:    string
  /** Authenticated user ID (UUID). Pass null for anonymous. */
  userId:    string | null
  /** Plan tier from the session/JWT. */
  planTier:  'free' | 'plus'
}

/** Minimal Redis interface — compatible with ioredis and @upstash/redis. */
export interface RedisLike {
  get(key: string): Promise<string | null>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number | 1>
}

/** UTC YYYY-MM-DD string for today — used to build daily reset keys. */
function utcDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Check and increment the daily query counter for this principal.
 *
 * On allowed: increments counter before returning so the count reflects the
 * current query. Callers should NOT increment again.
 *
 * On denied: does NOT increment (the quota is already exhausted).
 */
export async function checkQueryGate(opts: QueryGateOptions): Promise<QueryGateResult> {
  const { redis, ipHash, userId, planTier } = opts

  // Plus tier: unlimited — skip Redis entirely
  if (planTier === 'plus') {
    return {
      allowed:      true,
      queriesUsed:  0,
      queriesLimit: null,
      planTier:     'plus',
    }
  }

  // Free tier: key is user-scoped when authenticated, IP-scoped for anonymous
  const principal = userId ? `user:${userId}` : `ip:${ipHash}`
  const redisKey  = `ci:quota:${principal}:${utcDateKey()}`

  try {
    // Read current count first to avoid incrementing on a denied request
    const current = await redis.get(redisKey)
    const count   = current ? parseInt(current, 10) : 0

    if (count >= FREE_TIER_DAILY_LIMIT) {
      return {
        allowed:      false,
        queriesUsed:  count,
        queriesLimit: FREE_TIER_DAILY_LIMIT,
        planTier:     'free',
        reason:       'quota_exceeded',
      }
    }

    // Increment atomically — INCR is atomic in Redis
    const newCount = await redis.incr(redisKey)

    // Set TTL to 36 hours to cover midnight clock-skew edge cases
    // Only set on first create (when newCount === 1)
    if (newCount === 1) {
      await redis.expire(redisKey, 60 * 60 * 36)
    }

    return {
      allowed:      true,
      queriesUsed:  newCount,
      queriesLimit: FREE_TIER_DAILY_LIMIT,
      planTier:     'free',
    }
  } catch (err) {
    // Fail-open: Redis error does not block the user
    console.warn('[chatislam-query-gate] Redis error — failing open', {
      error: err instanceof Error ? err.message : String(err),
      principal,
    })

    return {
      allowed:      true,
      queriesUsed:  0,
      queriesLimit: FREE_TIER_DAILY_LIMIT,
      planTier:     'free',
      reason:       'redis_error',
    }
  }
}
