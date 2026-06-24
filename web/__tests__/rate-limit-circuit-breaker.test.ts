/**
 * rate-limit-circuit-breaker.test.ts
 *
 * Unit tests for AC-08 / G-05 / TRAP-19:
 *   The circuit-breaker wraps checkServerRateLimit and fails OPEN (with a capped
 *   burst allowance) when Redis is unreachable, rather than denying all requests.
 *
 * Coverage:
 *   1. CLOSED state: healthy Redis — delegates to real limiter, returns result
 *   2. CLOSED state: Redis error (#1) — fails open with in-memory cap, still CLOSED
 *   3. CLOSED state: Redis error >= threshold — trips to OPEN
 *   4. OPEN state: returns fail-open result without calling Redis
 *   5. OPEN state: respects in-memory cap (cap+1 request is denied)
 *   6. OPEN → HALF-OPEN after duration; probe request goes to real limiter
 *   7. HALF-OPEN: successful probe → circuit CLOSED
 *   8. HALF-OPEN: failed probe → circuit re-OPENS
 *   9. Env var CHATISLAM_RATE_LIMIT_FAILOPEN_CAP overrides default cap
 *  10. Fail-open result has allowed=true and retryAfterSeconds=0
 *  11. On cap exceeded in fail-open, allowed=false and retryAfterSeconds >= 1
 *
 * SPORT: P2-E5-W01-S01-T01 — robustness rollout / circuit-breaker tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock checkServerRateLimit so we control what "Redis" returns
// ---------------------------------------------------------------------------

vi.mock('@sentry/astro', () => ({
  captureException:   vi.fn(),
  captureMessage:     vi.fn(),
  addBreadcrumb:      vi.fn(),
}))

// We import the real circuit-breaker module; we mock checkServerRateLimit
vi.mock('../lib/rate-limit-server', () => ({
  checkServerRateLimit: vi.fn(),
}))

import { checkServerRateLimit }     from '../lib/rate-limit-server'
import {
  checkRateLimitWithCircuitBreaker,
  _cb,
  _resetCircuitBreaker,
} from '../lib/rate-limit-circuit-breaker'
import type { PerRequestRateLimitResult } from '../lib/rate-limit-server'

const mockCheck = vi.mocked(checkServerRateLimit)

const ALLOWED: PerRequestRateLimitResult = {
  allowed:           true,
  remaining:         9,
  resetAt:           Date.now() + 60_000,
  retryAfterSeconds: 0,
}

const REDIS_ERROR: PerRequestRateLimitResult = {
  allowed:           false,
  remaining:         0,
  resetAt:           Date.now() + 60_000,
  retryAfterSeconds: 60,
  redisError:        true,
}

const DENIED: PerRequestRateLimitResult = {
  allowed:           false,
  remaining:         0,
  resetAt:           Date.now() + 30_000,
  retryAfterSeconds: 30,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setEnv(cap?: number, durationMs?: number, threshold?: number) {
  if (cap !== undefined)      process.env.CHATISLAM_RATE_LIMIT_FAILOPEN_CAP  = String(cap)
  if (durationMs !== undefined) process.env.CHATISLAM_CB_OPEN_DURATION_MS   = String(durationMs)
  if (threshold !== undefined) process.env.CHATISLAM_CB_FAILURE_THRESHOLD   = String(threshold)
}

function clearEnv() {
  delete process.env.CHATISLAM_RATE_LIMIT_FAILOPEN_CAP
  delete process.env.CHATISLAM_CB_OPEN_DURATION_MS
  delete process.env.CHATISLAM_CB_FAILURE_THRESHOLD
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rate-limit-circuit-breaker', () => {
  beforeEach(() => {
    _resetCircuitBreaker()
    vi.clearAllMocks()
    clearEnv()
    vi.useRealTimers()
  })

  afterEach(() => {
    clearEnv()
    vi.useRealTimers()
  })

  // ── Test 1 ────────────────────────────────────────────────────────────────
  it('CLOSED: delegates to real limiter when Redis is healthy', async () => {
    mockCheck.mockResolvedValueOnce(ALLOWED)
    const result = await checkRateLimitWithCircuitBreaker('ci:rl:ip:abc:min', 10)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
    expect(mockCheck).toHaveBeenCalledOnce()
    expect(_cb.state).toBe('CLOSED')
  })

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it('CLOSED: single Redis error still returns fail-open (CLOSED until threshold)', async () => {
    setEnv(undefined, undefined, 3)  // threshold = 3
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)
    const result = await checkRateLimitWithCircuitBreaker('ci:rl:anon:aaa:min', 5)
    // Fail-open: should be allowed
    expect(result.allowed).toBe(true)
    // CB state still CLOSED (need 3 failures to trip)
    expect(_cb.state).toBe('CLOSED')
    expect(_cb.failureCount).toBe(1)
  })

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('CLOSED → OPEN: trips after threshold consecutive Redis errors', async () => {
    setEnv(undefined, undefined, 3)
    mockCheck.mockResolvedValue(REDIS_ERROR)

    for (let i = 0; i < 3; i++) {
      await checkRateLimitWithCircuitBreaker('ci:rl:anon:bbb:min', 5)
    }
    expect(_cb.state).toBe('OPEN')
  })

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it('OPEN: does NOT call real limiter — returns fail-open result', async () => {
    setEnv(20, 30_000, 1)  // trip on first failure; stay open 30s
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:ccc:min', 5)
    expect(_cb.state).toBe('OPEN')

    // Next request should NOT call real limiter
    mockCheck.mockClear()
    const result = await checkRateLimitWithCircuitBreaker('ci:rl:anon:ccc:min', 5)
    expect(mockCheck).not.toHaveBeenCalled()
    expect(result.allowed).toBe(true)  // fail-open
  })

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it('OPEN: in-memory cap is respected (cap+1 request is denied)', async () => {
    setEnv(3, 60_000, 1)  // cap=3, stay open 60s, trip on 1 failure
    const key = 'ci:rl:anon:ddd:min'
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)
    // The tripping request itself fails open and consumes one in-memory slot (count=1).
    await checkRateLimitWithCircuitBreaker(key, 5)  // trips circuit + consumes slot 1
    expect(_cb.state).toBe('OPEN')

    // cap=3 and the trip already used slot 1, so 2 more are allowed (slots 2 and 3).
    for (let i = 0; i < 2; i++) {
      const r = await checkRateLimitWithCircuitBreaker(key, 5)
      expect(r.allowed).toBe(true)
    }
    // The next (4th total within the window) exceeds cap and is denied.
    const denied = await checkRateLimitWithCircuitBreaker(key, 5)
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it('OPEN → HALF-OPEN after duration; probe goes to real limiter', async () => {
    vi.useFakeTimers()
    setEnv(20, 100, 1)  // stay OPEN for 100ms only
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)  // first call trips circuit
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:eee:min', 5)
    expect(_cb.state).toBe('OPEN')

    vi.advanceTimersByTime(200)  // past the 100ms open duration

    // Probe request — should call real limiter
    mockCheck.mockResolvedValueOnce(ALLOWED)
    const result = await checkRateLimitWithCircuitBreaker('ci:rl:anon:eee:min', 5)
    expect(_cb.state).toBe('CLOSED')  // probe succeeded
    expect(result.allowed).toBe(true)
  })

  // ── Test 7 ────────────────────────────────────────────────────────────────
  it('HALF-OPEN: successful probe → CLOSED', async () => {
    vi.useFakeTimers()
    setEnv(20, 100, 1)
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)  // trip
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:fff:min', 5)
    vi.advanceTimersByTime(200)
    mockCheck.mockResolvedValueOnce(ALLOWED)
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:fff:min', 5)
    expect(_cb.state).toBe('CLOSED')
    expect(_cb.failureCount).toBe(0)
  })

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it('HALF-OPEN: failed probe → re-OPEN', async () => {
    vi.useFakeTimers()
    setEnv(20, 100, 1)
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)  // trip
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:ggg:min', 5)
    vi.advanceTimersByTime(200)
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)  // probe fails
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:ggg:min', 5)
    expect(_cb.state).toBe('OPEN')
  })

  // ── Test 9 ────────────────────────────────────────────────────────────────
  it('CHATISLAM_RATE_LIMIT_FAILOPEN_CAP env var overrides default cap', async () => {
    setEnv(2, 60_000, 1)  // cap=2
    const key = 'ci:rl:anon:hhh:min'
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)  // trip — consumes slot 1
    await checkRateLimitWithCircuitBreaker(key, 5)

    // cap=2 and the trip already used slot 1, so only one more is allowed.
    const r1 = await checkRateLimitWithCircuitBreaker(key, 5)  // slot 2 — allowed
    const r2 = await checkRateLimitWithCircuitBreaker(key, 5)  // over cap — denied
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(false)
  })

  // ── Test 10 ───────────────────────────────────────────────────────────────
  it('fail-open result has allowed=true and retryAfterSeconds=0', async () => {
    setEnv(20, 60_000, 1)
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:iii:min', 5)

    const result = await checkRateLimitWithCircuitBreaker('ci:rl:anon:iii:min', 5)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  // ── Test 11 ───────────────────────────────────────────────────────────────
  it('fail-open cap exceeded: allowed=false, retryAfterSeconds >= 1', async () => {
    setEnv(1, 60_000, 1)  // cap=1
    mockCheck.mockResolvedValueOnce(REDIS_ERROR)
    await checkRateLimitWithCircuitBreaker('ci:rl:anon:jjj:min', 5)  // trip

    await checkRateLimitWithCircuitBreaker('ci:rl:anon:jjj:min', 5)  // uses cap (1st)
    const denied = await checkRateLimitWithCircuitBreaker('ci:rl:anon:jjj:min', 5)  // over cap
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })
})
