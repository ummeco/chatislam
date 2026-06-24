/**
 * FILE:    chatislam/web/lib/rate-limit-circuit-breaker.ts
 * PURPOSE: Circuit-breaker wrapper for the Redis rate-limiter.
 *   When Redis is unreachable (ECONNREFUSED, timeout, etc.) the limiter switches
 *   from FAIL-CLOSED to FAIL-OPEN with a capped burst allowance per IP.
 *
 * States:
 *   CLOSED     — Redis healthy; all requests go through the normal limiter.
 *   OPEN       — Redis unhealthy; fail-open with in-memory cap per IP.
 *   HALF-OPEN  — probe period: one request through the real limiter to test recovery.
 *
 * Env vars:
 *   CHATISLAM_RATE_LIMIT_FAILOPEN_CAP   — max req/min per IP when open (default: 20)
 *   CHATISLAM_CB_OPEN_DURATION_MS       — ms to stay OPEN before HALF-OPEN probe (default: 30 000)
 *   CHATISLAM_CB_FAILURE_THRESHOLD      — consecutive failures to trip OPEN (default: 3)
 *
 * Inputs:  key (string), limit (number)
 * Outputs: PerRequestRateLimitResult (same interface as checkServerRateLimit)
 *
 * Constraints:
 *   - No external dependencies — uses in-memory Map; resets on cold-start (acceptable for a rate-limit fallback)
 *   - Thread-safe within a single Node.js process (single-threaded event loop)
 *   - The fail-open cap intentionally covers only ANON IP keys; authed-user keys pass through normally
 *     when Redis is healthy; if Redis is down they also fail-open with the same cap for safety
 *
 * SPORT: P2-E5-W01-S01-T01 — TRAP-19 / AC-08 / G-05 circuit-breaker
 * Ref: .claude/docs/p2-robustness-framework-spec.md §5 (circuit-breaker)
 */

import * as Sentry from '@sentry/nextjs'
import { checkServerRateLimit } from './rate-limit-server'
import type { PerRequestRateLimitResult } from './rate-limit-server'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getFailOpenCap(): number {
  const raw = process.env.CHATISLAM_RATE_LIMIT_FAILOPEN_CAP
  const n   = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 20
}

function getOpenDurationMs(): number {
  const raw = process.env.CHATISLAM_CB_OPEN_DURATION_MS
  const n   = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 30_000
}

function getFailureThreshold(): number {
  const raw = process.env.CHATISLAM_CB_FAILURE_THRESHOLD
  const n   = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 3
}

// ---------------------------------------------------------------------------
// Circuit-breaker state (process-singleton)
// ---------------------------------------------------------------------------

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CBMeta {
  state:             CBState
  failureCount:      number
  openedAt:          number | null
  halfOpenProbeKey:  string | null
}

// Exported for unit tests only — never modify directly in application code
export const _cb: CBMeta = {
  state:            'CLOSED',
  failureCount:     0,
  openedAt:         null,
  halfOpenProbeKey: null,
}

/** Reset state (used in tests only). */
export function _resetCircuitBreaker(): void {
  _cb.state            = 'CLOSED'
  _cb.failureCount     = 0
  _cb.openedAt         = null
  _cb.halfOpenProbeKey = null
  _inMemoryCounters.clear()
}

// ---------------------------------------------------------------------------
// In-memory fail-open counters (per IP key, 1-minute sliding window)
// ---------------------------------------------------------------------------

interface InMemoryWindow {
  count:    number
  windowMs: number  // start of current window (epoch ms)
}

// key → InMemoryWindow
const _inMemoryCounters = new Map<string, InMemoryWindow>()
const WINDOW_MS = 60_000

/**
 * checkInMemory — sliding window count tracked in-process.
 * Resets automatically when the 1-minute window rolls over.
 */
function checkInMemory(key: string, cap: number): PerRequestRateLimitResult {
  const now = Date.now()
  let entry = _inMemoryCounters.get(key)

  if (!entry || now - entry.windowMs >= WINDOW_MS) {
    entry = { count: 0, windowMs: now }
  }

  const resetAt = entry.windowMs + WINDOW_MS

  if (entry.count >= cap) {
    return {
      allowed:           false,
      remaining:         0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }

  entry.count++
  _inMemoryCounters.set(key, entry)

  return {
    allowed:           true,
    remaining:         cap - entry.count,
    resetAt,
    retryAfterSeconds: 0,
  }
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

function onRedisSuccess(): void {
  if (_cb.state === 'HALF_OPEN' || _cb.state === 'OPEN') {
    console.info('[rate-limit-cb] Redis recovered — circuit CLOSED')
  }
  _cb.state            = 'CLOSED'
  _cb.failureCount     = 0
  _cb.openedAt         = null
  _cb.halfOpenProbeKey = null
}

function onRedisFailure(key: string): void {
  _cb.failureCount++
  Sentry.addBreadcrumb({
    category: 'rate-limit-cb',
    message:  `Redis failure #${_cb.failureCount} (key=${key})`,
    level:    'warning',
  })

  if (_cb.state === 'CLOSED' && _cb.failureCount >= getFailureThreshold()) {
    _cb.state    = 'OPEN'
    _cb.openedAt = Date.now()
    console.error(
      `[rate-limit-cb] Circuit OPEN after ${_cb.failureCount} failures — fail-open cap=${getFailOpenCap()} req/min`
    )
    Sentry.captureMessage('[ChatIslam] Rate-limit circuit-breaker OPEN — Redis unreachable', 'error')
  } else if (_cb.state === 'HALF_OPEN') {
    // Probe failed — reopen
    _cb.state    = 'OPEN'
    _cb.openedAt = Date.now()
    console.warn('[rate-limit-cb] HALF-OPEN probe failed — circuit re-OPEN')
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * checkRateLimitWithCircuitBreaker — drop-in replacement for checkServerRateLimit.
 *
 * Behaviour:
 *   - CLOSED:    delegates to checkServerRateLimit normally.
 *   - OPEN:      skips Redis; returns fail-open result with in-memory cap.
 *   - HALF-OPEN: allows one probe request through the real limiter per window.
 *
 * @param key   Redis key (e.g. `ci:rl:anon:${ipHash}:min`)
 * @param limit Normal limit (used when Redis is healthy)
 */
export async function checkRateLimitWithCircuitBreaker(
  key:   string,
  limit: number,
): Promise<PerRequestRateLimitResult> {
  const cap = getFailOpenCap()

  // ── OPEN state ────────────────────────────────────────────────────────────
  if (_cb.state === 'OPEN') {
    const elapsed = Date.now() - (_cb.openedAt ?? 0)
    if (elapsed >= getOpenDurationMs()) {
      // Transition to HALF-OPEN for a probe
      _cb.state            = 'HALF_OPEN'
      _cb.halfOpenProbeKey = key
      console.info('[rate-limit-cb] Circuit HALF-OPEN — probing Redis')
    } else {
      // Still open — use in-memory cap
      return checkInMemory(key, cap)
    }
  }

  // ── HALF-OPEN state ────────────────────────────────────────────────────────
  if (_cb.state === 'HALF_OPEN') {
    // Let exactly one probe through; all others use in-memory cap during probe
    if (_cb.halfOpenProbeKey !== null && _cb.halfOpenProbeKey !== key) {
      return checkInMemory(key, cap)
    }
    // Probe — fall through to real limiter below
  }

  // ── CLOSED or HALF-OPEN probe ─────────────────────────────────────────────
  try {
    const result = await checkServerRateLimit(key, limit)

    if (result.redisError) {
      onRedisFailure(key)
      // Transition already handled — return fail-open result
      return checkInMemory(key, cap)
    }

    onRedisSuccess()
    return result
  } catch (err) {
    // Unexpected error from the limiter itself
    Sentry.captureException(err, { tags: { component: 'rate-limit-cb' } })
    onRedisFailure(key)
    return checkInMemory(key, cap)
  }
}
