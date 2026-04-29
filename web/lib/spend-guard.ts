/**
 * ChatIslam — Anthropic Spend Guard (T0-20-01, CRIT-02)
 *
 * Enforces a daily USD spend cap on Anthropic API calls without a race condition.
 *
 * ## The race condition this fixes
 *
 * The old pattern was:
 *   1. GET spend:daily:{date}         → read current total
 *   2. if total + cost > cap: reject
 *   3. call Anthropic (may take 2-10 seconds)
 *   4. INCRBYFLOAT spend:daily:{date} cost
 *
 * Under 100 concurrent requests all reading stale totals in step 1, every one
 * passes the cap check simultaneously, then all increment — overshooting the cap
 * by up to N * avg_cost.
 *
 * ## The fix: INCRBYFLOAT-first
 *
 *   1. INCRBYFLOAT spend:daily:{date} estimatedCost  → new total (atomic)
 *   2. if new total > cap:
 *      a. INCRBYFLOAT spend:daily:{date} -estimatedCost  (roll back)
 *      b. reject 503
 *   3. call Anthropic
 *   4. INCRBYFLOAT spend:daily:{date} (actualCost - estimatedCost)  → correction
 *
 * Redis INCRBYFLOAT is a single atomic command — no two requests can both pass
 * the cap at the same time. The pessimistic estimate + correction pattern keeps
 * the running total accurate within one request's cost.
 *
 * ## Key schema
 *
 *   ai:spend:daily:USD:{YYYY-MM-DD}   — float, USD, auto-expires at 36h
 *
 * ## Env vars
 *
 *   RATE_LIMIT_ANTHROPIC_GLOBAL_USD_DAILY — daily cap in USD (disabled if unset/0)
 *   ANTHROPIC_ESTIMATED_COST_PER_REQUEST  — pessimistic per-request estimate used
 *                                           for the pre-flight hold (default: 0.01)
 */

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class AnthropicSpendCapExceeded extends Error {
  readonly currentUsd: number
  readonly capUsd:     number

  constructor(currentUsd: number, capUsd: number) {
    super(`Spend cap exceeded: $${currentUsd.toFixed(4)} / $${capUsd.toFixed(2)} daily`)
    this.name       = 'AnthropicSpendCapExceeded'
    this.currentUsd = currentUsd
    this.capUsd     = capUsd
  }
}

// ---------------------------------------------------------------------------
// Redis interface (subset used by SpendGuard — avoids ioredis type dep)
// ---------------------------------------------------------------------------

export interface SpendGuardRedis {
  incrbyfloat(key: string, increment: number): Promise<string | number>
  expire(key: string, seconds: number): Promise<number>
}

// ---------------------------------------------------------------------------
// SpendGuard
// ---------------------------------------------------------------------------

/** TTL for the daily spend key: 36 hours in seconds. */
const DAILY_KEY_TTL_S = 60 * 60 * 36

/**
 * Pessimistic per-request cost hold in USD.
 * Applied atomically before calling Anthropic. Corrected after the real cost is known.
 * Default: $0.01 (generous for claude-sonnet-4-6 at ~333 input + 133 output tokens).
 */
const DEFAULT_ESTIMATED_COST = 0.01

export class SpendGuard {
  private readonly capUsdDaily:      number
  private readonly estimatedCostHold: number

  constructor(
    private readonly redis:   SpendGuardRedis,
    capUsdDaily:    number,
    estimatedCostHold?: number,
  ) {
    this.capUsdDaily       = capUsdDaily
    this.estimatedCostHold = estimatedCostHold ?? DEFAULT_ESTIMATED_COST
  }

  private dayKey(): string {
    return `ai:spend:daily:USD:${new Date().toISOString().slice(0, 10)}`
  }

  /**
   * Atomically reserve capacity for one request.
   *
   * Increments the daily counter by `estimatedCostHold` first.
   * If the new total exceeds the cap, rolls back and throws AnthropicSpendCapExceeded.
   *
   * Returns a `release(actualCost)` function that callers MUST invoke after the
   * Anthropic call completes (even on error) to apply the actual-vs-estimated correction.
   *
   * Usage:
   *   const release = await guard.reserve()      // throws if cap exceeded
   *   try {
   *     const result = await callAnthropic()
   *     await release(result.costUsd)            // corrects the estimate
   *   } catch {
   *     await release(0)                         // rolls back the hold entirely
   *   }
   */
  async reserve(): Promise<(actualCostUsd: number) => Promise<void>> {
    const key  = this.dayKey()
    const hold = this.estimatedCostHold

    // Atomic: increment first, then check
    const newTotalRaw = await this.redis.incrbyfloat(key, hold)
    const newTotal    = Number(newTotalRaw)

    // Ensure TTL is set (idempotent — Redis only updates if key already has a TTL < this value;
    // we call it on every reserve() so a new day's first request always gets the TTL set).
    await this.redis.expire(key, DAILY_KEY_TTL_S)

    if (newTotal > this.capUsdDaily) {
      // Roll back: we over-committed — return the hold immediately
      await this.redis.incrbyfloat(key, -hold)
      throw new AnthropicSpendCapExceeded(newTotal, this.capUsdDaily)
    }

    // Return a correction function. Called after the Anthropic response is received.
    // correction = actualCostUsd - hold
    //   positive: actual was more expensive than estimate (add the difference)
    //   negative: actual was cheaper (subtract the difference — safe; can't push below 0
    //             in a meaningful way since other concurrent requests raised the floor)
    //   zero:     called on error/cancel — rolls back the entire hold
    let corrected = false
    return async (actualCostUsd: number): Promise<void> => {
      if (corrected) return  // idempotent guard
      corrected = true

      const correction = actualCostUsd - hold
      if (correction !== 0) {
        await this.redis.incrbyfloat(key, correction)
      }
      // Re-set TTL to ensure it stays alive even if the correction crosses midnight
      await this.redis.expire(key, DAILY_KEY_TTL_S)
    }
  }

  /**
   * Read the current accumulated spend for today (non-atomic, best-effort).
   * Suitable for dashboards and health checks — do NOT use for cap enforcement.
   * For cap enforcement, always use reserve().
   */
  async current(): Promise<number> {
    // We use incrbyfloat(0) to read atomically without a separate GET command.
    // incrbyfloat(0) returns the current value and is safe for read-only purposes.
    const raw = await this.redis.incrbyfloat(this.dayKey(), 0)
    return Number(raw)
  }
}

// ---------------------------------------------------------------------------
// Factory (singleton per process)
// ---------------------------------------------------------------------------

let _instance: SpendGuard | null = null

/**
 * Get the process-global SpendGuard, or null if spend-cap is not configured.
 *
 * Env:
 *   RATE_LIMIT_ANTHROPIC_GLOBAL_USD_DAILY — daily cap (required; disabled if unset/0)
 *   ANTHROPIC_ESTIMATED_COST_PER_REQUEST  — per-request hold (optional; default 0.01)
 *   REDIS_URL                             — ioredis connection string (required for guard)
 */
export function getSpendGuard(redisOverride?: SpendGuardRedis): SpendGuard | null {
  if (_instance) return _instance

  const capRaw = process.env.RATE_LIMIT_ANTHROPIC_GLOBAL_USD_DAILY
  if (!capRaw) return null

  const capUsdDaily = Number(capRaw)
  if (!Number.isFinite(capUsdDaily) || capUsdDaily <= 0) return null

  const estimatedHold = process.env.ANTHROPIC_ESTIMATED_COST_PER_REQUEST
    ? Number(process.env.ANTHROPIC_ESTIMATED_COST_PER_REQUEST)
    : undefined

  let redis: SpendGuardRedis
  if (redisOverride) {
    redis = redisOverride
  } else {
    const url = process.env.REDIS_URL
    if (!url) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require('ioredis') as {
        Redis: new (url: string, opts: object) => SpendGuardRedis
      }
      redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue:   false,
        lazyConnect:          true,
        connectTimeout:       2_000,
      })
    } catch {
      return null
    }
  }

  _instance = new SpendGuard(redis, capUsdDaily, estimatedHold)
  return _instance
}

/**
 * Reset the singleton (used in tests only).
 */
export function _resetSpendGuard(): void {
  _instance = null
}
