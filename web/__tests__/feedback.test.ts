/**
 * ChatIslam — /api/feedback POST handler tests (T04-P9)
 *
 * Test coverage:
 *   1. Happy path: valid thumbs-up submission returns { success: true }
 *   2. Happy path: valid thumbs-down with correction + flagged_reason
 *   3. Validation: missing message_id → 400
 *   4. Validation: invalid UUID for message_id → 400
 *   5. Validation: rating 0 (not -1 or 1) → 400
 *   6. Validation: correction_text > 500 chars → 400
 *   7. Validation: invalid flagged_reason → 400
 *   8. Rate limit: 11th submission from same session → 429
 *   9. Redis down: falls back gracefully (allows submission)
 *  10. Hasura error: returns 500
 *  11. PII scrub: email pattern stripped from correction_text before persist
 *  12. PII scrub: phone pattern stripped from correction_text before persist
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mock ioredis (Redis client) ──────────────────────────────────────────────

type RedisCommand = { cmd: string; args: unknown[] }

function makeRedisMock(options: {
  incrValue?: number
  ttlValue?: number
  shouldThrow?: boolean
}) {
  const { incrValue = 1, ttlValue = 3600, shouldThrow = false } = options

  return class MockRedis {
    async incr(_key: string): Promise<number> {
      if (shouldThrow) throw new Error('Redis connection refused')
      return incrValue
    }
    async expire(_key: string, _seconds: number): Promise<number> {
      return 1
    }
    async ttl(_key: string): Promise<number> {
      return ttlValue
    }
  }
}

// ─── Mock fetch (Hasura) ──────────────────────────────────────────────────────

function makeHasuraMock(options: {
  shouldFail?: boolean
  graphqlError?: string
}) {
  const { shouldFail = false, graphqlError } = options

  return vi.fn().mockImplementation(async () => {
    if (shouldFail) {
      return { ok: false, status: 500, text: async () => 'Internal Server Error' }
    }
    const body = graphqlError
      ? { errors: [{ message: graphqlError }] }
      : { data: { insert_ci_message_feedback_one: { id: 'mock-uuid' } } }
    return {
      ok: true,
      status: 200,
      json: async () => body,
    }
  })
}

// ─── Helper to build a NextRequest ───────────────────────────────────────────

const VALID_MSG_ID  = '11111111-1111-1111-1111-111111111111'
const VALID_SESS_ID = '22222222-2222-2222-2222-222222222222'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/feedback', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('/api/feedback POST handler', () => {
  beforeEach(() => {
    vi.resetModules()
    // Set required env vars
    process.env.HASURA_ADMIN_URL = 'https://api.ummat.dev/v1/graphql'
    process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'test-secret'
    // No REDIS_URL by default (rate limiter falls back gracefully)
    delete process.env.REDIS_URL
  })

  it('1. Happy path: thumbs-up returns { success: true }', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(json.success).toBe(true)
  })

  it('2. Happy path: thumbs-down with correction + flagged_reason', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({
      message_id:      VALID_MSG_ID,
      session_id:      VALID_SESS_ID,
      rating:          -1,
      correction_text: 'The answer was incomplete regarding Shafi madhhab.',
      flagged_reason:  'incorrect',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(json.success).toBe(true)
  })

  it('3. Validation: missing message_id → 400', async () => {
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect(typeof json.error).toBe('string')
    expect((json.error as string).toLowerCase()).toContain('message_id')
  })

  it('4. Validation: invalid UUID for message_id → 400', async () => {
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: 'not-a-uuid', session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string).toLowerCase()).toContain('message_id')
  })

  it('5. Validation: rating 0 → 400', async () => {
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 0 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string).toLowerCase()).toContain('rating')
  })

  it('6. Validation: correction_text > 500 chars → 400', async () => {
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({
      message_id:      VALID_MSG_ID,
      session_id:      VALID_SESS_ID,
      rating:          -1,
      correction_text: 'x'.repeat(501),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string).toLowerCase()).toContain('correction_text')
  })

  it('7. Validation: invalid flagged_reason → 400', async () => {
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({
      message_id:     VALID_MSG_ID,
      session_id:     VALID_SESS_ID,
      rating:         -1,
      flagged_reason: 'heresy',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string).toLowerCase()).toContain('flagged_reason')
  })

  it('8. Rate limit: 11th submission → 429 with retry_after', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    vi.mock('ioredis', () => ({ Redis: makeRedisMock({ incrValue: 11, ttlValue: 1800 }) }))
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json() as Record<string, unknown>
    expect(json.error).toBe('rate_limited')
    expect(typeof json.retry_after).toBe('number')
    expect(json.retry_after as number).toBeGreaterThan(0)
  })

  it('9. Redis down: falls back gracefully (allows submission)', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    vi.mock('ioredis', () => ({ Redis: makeRedisMock({ shouldThrow: true }) }))
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    // Graceful: allowed on Redis error
    expect(res.status).toBe(200)
  })

  it('10. Hasura error: returns 500', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({ shouldFail: true }))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json() as Record<string, unknown>
    expect(json.error).toBe('internal')
  })

  it('11. PII scrub: email stripped from correction_text', async () => {
    let capturedPayload: Record<string, unknown> | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { variables?: { object?: Record<string, unknown> } }
      capturedPayload = body.variables?.object ?? null
      return { ok: true, status: 200, json: async () => ({ data: { insert_ci_message_feedback_one: { id: 'x' } } }) }
    }))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({
      message_id:      VALID_MSG_ID,
      session_id:      VALID_SESS_ID,
      rating:          -1,
      correction_text: 'Contact me at user@example.com for details',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(capturedPayload).not.toBeNull()
    expect((capturedPayload!['correction_text'] as string)).not.toContain('user@example.com')
    expect((capturedPayload!['correction_text'] as string)).toContain('[email]')
  })

  it('12. PII scrub: phone number stripped from correction_text', async () => {
    let capturedPayload: Record<string, unknown> | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { variables?: { object?: Record<string, unknown> } }
      capturedPayload = body.variables?.object ?? null
      return { ok: true, status: 200, json: async () => ({ data: { insert_ci_message_feedback_one: { id: 'x' } } }) }
    }))
    const { POST } = await import('../app/api/feedback/route')
    const req = makeRequest({
      message_id:      VALID_MSG_ID,
      session_id:      VALID_SESS_ID,
      rating:          -1,
      correction_text: 'Call 555-867-5309 to verify',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(capturedPayload).not.toBeNull()
    expect((capturedPayload!['correction_text'] as string)).not.toContain('555-867-5309')
    expect((capturedPayload!['correction_text'] as string)).toContain('[phone]')
  })
})
