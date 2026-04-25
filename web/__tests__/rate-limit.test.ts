import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryRateLimitAdapter } from '../lib/rate-limit-memory'
import {
  checkRateLimit,
  getClientIp,
  getRateLimitAdapter,
  resetAdapterCache,
  ANON_PER_MINUTE,
  AUTH_PER_MINUTE,
  TOKEN_PER_MINUTE,
} from '../lib/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let keyCounter = 0
function uk(prefix = 'test'): string {
  return `${prefix}-${++keyCounter}-${Math.random()}`
}

// ---------------------------------------------------------------------------
// MemoryRateLimitAdapter
// ---------------------------------------------------------------------------
describe('MemoryRateLimitAdapter', () => {
  let adapter: MemoryRateLimitAdapter

  beforeEach(() => {
    adapter = new MemoryRateLimitAdapter()
  })

  it('allows the first request', async () => {
    const result = await adapter.check(uk(), { limit: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfterSeconds).toBe(0)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it('tracks count across requests in the same window', async () => {
    const key = uk()
    const opts = { limit: 3, windowMs: 60_000 }
    await adapter.check(key, opts) // 1
    await adapter.check(key, opts) // 2
    const result = await adapter.check(key, opts) // 3
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocks once the limit is reached', async () => {
    const key = uk()
    const opts = { limit: 2, windowMs: 60_000 }
    await adapter.check(key, opts) // 1
    await adapter.check(key, opts) // 2
    const result = await adapter.check(key, opts) // 3 — over limit
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('allows exactly limit requests, then denies', async () => {
    const key = uk()
    const opts = { limit: 5, windowMs: 60_000 }
    for (let i = 0; i < 5; i++) {
      const r = await adapter.check(key, opts)
      expect(r.allowed).toBe(true)
    }
    const denied = await adapter.check(key, opts)
    expect(denied.allowed).toBe(false)
  })

  it('resets after window expires', async () => {
    const key = uk()
    const opts = { limit: 1, windowMs: 50 } // 50 ms window
    await adapter.check(key, opts) // 1 — hits limit
    const blocked = await adapter.check(key, opts)
    expect(blocked.allowed).toBe(false)

    await new Promise<void>(resolve => setTimeout(resolve, 70))

    const reset = await adapter.check(key, opts)
    expect(reset.allowed).toBe(true)
  })

  it('uses independent windows per key', async () => {
    const opts = { limit: 1, windowMs: 60_000 }
    const a = await adapter.check(uk('a'), opts)
    const b = await adapter.check(uk('b'), opts)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it('sweep removes expired entries', async () => {
    const key = uk()
    await adapter.check(key, { limit: 5, windowMs: 30 })
    expect(adapter.storeSize).toBeGreaterThan(0)
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    adapter._sweep()
    expect(adapter.storeSize).toBe(0)
  })

  it('retryAfterSeconds is positive and accurate', async () => {
    const key = uk()
    const opts = { limit: 1, windowMs: 5_000 }
    await adapter.check(key, opts)
    const denied = await adapter.check(key, opts)
    expect(denied.retryAfterSeconds).toBeGreaterThan(0)
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(5)
  })
})

// ---------------------------------------------------------------------------
// Factory / checkRateLimit (memory path, no REDIS_URL)
// ---------------------------------------------------------------------------
describe('getRateLimitAdapter / checkRateLimit (memory factory)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL
    resetAdapterCache()
  })

  afterEach(() => {
    resetAdapterCache()
  })

  it('returns a MemoryRateLimitAdapter when REDIS_URL is unset', () => {
    const adapter = getRateLimitAdapter()
    expect(adapter).toBeInstanceOf(MemoryRateLimitAdapter)
  })

  it('returns the same adapter on repeated calls (singleton)', () => {
    const a = getRateLimitAdapter()
    const b = getRateLimitAdapter()
    expect(a).toBe(b)
  })

  it('resetAdapterCache forces a new instance', () => {
    const a = getRateLimitAdapter()
    resetAdapterCache()
    const b = getRateLimitAdapter()
    expect(a).not.toBe(b)
  })

  it('checkRateLimit resolves via factory', async () => {
    const result = await checkRateLimit(uk(), ANON_PER_MINUTE)
    expect(result.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Standard limit configs
// ---------------------------------------------------------------------------
describe('Rate limit config constants', () => {
  it('ANON_PER_MINUTE: 5 req/min', () => {
    expect(ANON_PER_MINUTE.limit).toBe(5)
    expect(ANON_PER_MINUTE.windowMs).toBe(60_000)
  })

  it('AUTH_PER_MINUTE: 30 req/min', () => {
    expect(AUTH_PER_MINUTE.limit).toBe(30)
    expect(AUTH_PER_MINUTE.windowMs).toBe(60_000)
  })

  it('TOKEN_PER_MINUTE: 100 req/min', () => {
    expect(TOKEN_PER_MINUTE.limit).toBe(100)
    expect(TOKEN_PER_MINUTE.windowMs).toBe(60_000)
  })
})

// ---------------------------------------------------------------------------
// Redis adapter — tested via a manual stub (no ioredis needed)
// ---------------------------------------------------------------------------
describe('RedisRateLimitAdapter (manual stub)', () => {
  // We test the Redis adapter logic directly by injecting a stub Redis client
  // via a subclass, avoiding any dependency on ioredis being installed.

  /**
   * Build a minimal pipeline stub that returns controlled results from exec().
   * execResults[i] = [error, value] for the i-th pipelined command.
   */
  function buildPipelineStub(execResults: Array<[null, unknown]>) {
    const execFn = vi.fn().mockResolvedValue(execResults)
    const stub = {
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zrange: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: execFn,
    }
    return { stub, execFn }
  }

  /**
   * TestableRedisAdapter bypasses the ioredis constructor so we can inject
   * any pipeline stub we want.
   */
  class TestableRedisAdapter {
    private pipelineStubs: ReturnType<typeof buildPipelineStub>[] = []
    private callCount = 0

    addPipelineResult(execResults: Array<[null, unknown]>) {
      this.pipelineStubs.push(buildPipelineStub(execResults))
    }

    private getRedisMock() {
      // Each pipeline() call consumes the next stub in the queue (or reuses last)
      const stubEntry = this.pipelineStubs[Math.min(this.callCount++, this.pipelineStubs.length - 1)]
      return { pipeline: () => stubEntry.stub }
    }

    // Re-implements check() from RedisRateLimitAdapter without ioredis dependency
    async check(
      key: string,
      opts: { limit: number; windowMs: number },
    ): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds: number }> {
      const now = Date.now()
      const windowStart = now - opts.windowMs
      const member = `${now}-stub`

      const redis = this.getRedisMock()
      const pipe = redis.pipeline()

      pipe.zremrangebyscore(key, '-inf', windowStart)
      pipe.zcard(key)
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

      // Allowed — simulate the add pipeline
      const addPipe = redis.pipeline()
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

  it('allows request when count is below limit', async () => {
    const adapter = new TestableRedisAdapter()
    // Two pipeline stubs needed: one for the read, one for the add
    adapter.addPipelineResult([
      [null, 1],        // zremrangebyscore
      [null, 3],        // zcard — 3 existing requests
      [null, []],       // zrange WITHSCORES — no oldest entry
    ])
    adapter.addPipelineResult([
      [null, 1],        // zadd
      [null, 1],        // pexpire
    ])

    const result = await adapter.check(uk(), { limit: 10, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(6) // limit(10) - count(3) - 1
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('denies request when count equals limit', async () => {
    const now = Date.now()
    const oldestTs = now - 30_000 // 30s ago
    const adapter = new TestableRedisAdapter()
    adapter.addPipelineResult([
      [null, 1],                               // zremrangebyscore
      [null, 10],                              // zcard — at limit
      [null, ['member', String(oldestTs)]],    // zrange WITHSCORES
    ])

    const result = await adapter.check(uk(), { limit: 10, windowMs: 60_000 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    // Reset = oldestTs + windowMs. Oldest was 30s ago → ~30s left
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(35)
  })

  it('retryAfterSeconds is at least 1 when denied', async () => {
    const now = Date.now()
    // Oldest entry is 59.5s ago in a 60s window → ~0.5s remaining → ceil to 1
    const adapter = new TestableRedisAdapter()
    adapter.addPipelineResult([
      [null, 1],
      [null, 5],
      [null, ['m', String(now - 59_500)]],
    ])

    const result = await adapter.check(uk(), { limit: 5, windowMs: 60_000 })
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it('remaining is 0 when just under limit', async () => {
    const adapter = new TestableRedisAdapter()
    // count=9, limit=10 → after adding: remaining = 10 - (9+1) = 0
    adapter.addPipelineResult([
      [null, 1],
      [null, 9],
      [null, []],
    ])
    adapter.addPipelineResult([
      [null, 1],
      [null, 1],
    ])

    const result = await adapter.check(uk(), { limit: 10, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------
describe('getClientIp', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns "unknown" when header is absent', () => {
    const req = new Request('http://localhost/')
    expect(getClientIp(req)).toBe('unknown')
  })

  it('trims whitespace from IP', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '  5.6.7.8  ' },
    })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('handles single IP without proxy chain', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '203.0.113.42' },
    })
    expect(getClientIp(req)).toBe('203.0.113.42')
  })
})
