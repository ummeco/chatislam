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
import type { APIContext } from 'astro'

// ─── Mock ioredis (Redis client) ──────────────────────────────────────────────
// The route loads ioredis via CJS require('ioredis'), so the mock MUST be registered
// at module top-level (hoisted) — an in-test vi.mock would not intercept require().
// Per-test behaviour is driven by the mutable `redisState` object.

const redisState = {
  incrValue:   1,
  ttlValue:    3600,
  shouldThrow: false,
}

vi.mock('ioredis', () => {
  class MockRedis {
    async incr(_key: string): Promise<number> {
      if (redisState.shouldThrow) throw new Error('Redis connection refused')
      return redisState.incrValue
    }
    async expire(_key: string, _seconds: number): Promise<number> {
      return 1
    }
    async ttl(_key: string): Promise<number> {
      return redisState.ttlValue
    }
  }
  // Support both `const { Redis } = require('ioredis')` and `import Redis from 'ioredis'`.
  return { Redis: MockRedis, default: MockRedis }
})

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

// ─── Helper to build an Astro APIContext ──────────────────────────────────────
// Astro endpoint signature: POST({ request }: APIContext) with the platform Request.
// Migrated from next/server NextRequest (D-P2-STACK-CANON).

const VALID_MSG_ID  = '11111111-1111-1111-1111-111111111111'
const VALID_SESS_ID = '22222222-2222-2222-2222-222222222222'

function makeRequest(body: Record<string, unknown>): APIContext {
  const request = new Request('http://localhost/api/feedback', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  return { request } as unknown as APIContext
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('/api/feedback POST handler', () => {
  beforeEach(() => {
    // Reset the route module so its cached Redis singleton (_feedbackRedis) does not
    // leak between tests. The hoisted vi.mock('ioredis') survives resetModules and is
    // re-applied to the route's dynamic import('ioredis').
    vi.resetModules()
    // Reset the ioredis mock to its default (under-limit, no throw) state.
    redisState.incrValue   = 1
    redisState.ttlValue    = 3600
    redisState.shouldThrow = false
    // Set required env vars
    process.env.HASURA_ADMIN_URL = 'https://api.ummat.dev/v1/graphql'
    process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'test-secret'
    // No REDIS_URL by default (rate limiter falls back gracefully)
    delete process.env.REDIS_URL
  })

  it('1. Happy path: thumbs-up returns { success: true }', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(json.success).toBe(true)
  })

  it('2. Happy path: thumbs-down with correction + flagged_reason', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../src/pages/api/feedback')
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
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({ session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string; details: { fieldErrors: Record<string, unknown> } }
    expect(json.error).toBe('invalid_input')
    expect(Object.keys(json.details.fieldErrors)).toContain('message_id')
  })

  it('4. Validation: invalid UUID for message_id → 400', async () => {
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({ message_id: 'not-a-uuid', session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string; details: { fieldErrors: Record<string, unknown> } }
    expect(json.error).toBe('invalid_input')
    expect(Object.keys(json.details.fieldErrors)).toContain('message_id')
  })

  it('5. Validation: rating 0 → 400', async () => {
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 0 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string; details: { fieldErrors: Record<string, unknown> } }
    expect(json.error).toBe('invalid_input')
    expect(Object.keys(json.details.fieldErrors)).toContain('rating')
  })

  it('6. Validation: correction_text > 500 chars → 400', async () => {
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({
      message_id:      VALID_MSG_ID,
      session_id:      VALID_SESS_ID,
      rating:          -1,
      correction_text: 'x'.repeat(501),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string; details: { fieldErrors: Record<string, unknown> } }
    expect(json.error).toBe('invalid_input')
    expect(Object.keys(json.details.fieldErrors)).toContain('correction_text')
  })

  it('7. Validation: invalid flagged_reason → 400', async () => {
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({
      message_id:     VALID_MSG_ID,
      session_id:     VALID_SESS_ID,
      rating:         -1,
      flagged_reason: 'heresy',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json() as { error: string; details: { fieldErrors: Record<string, unknown> } }
    expect(json.error).toBe('invalid_input')
    expect(Object.keys(json.details.fieldErrors)).toContain('flagged_reason')
  })

  it('8. Rate limit: 11th submission → 429 with retry_after', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    redisState.incrValue = 11
    redisState.ttlValue  = 1800
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../src/pages/api/feedback')
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
    redisState.shouldThrow = true
    vi.stubGlobal('fetch', makeHasuraMock({}))
    const { POST } = await import('../src/pages/api/feedback')
    const req = makeRequest({ message_id: VALID_MSG_ID, session_id: VALID_SESS_ID, rating: 1 })
    const res = await POST(req)
    // Graceful: allowed on Redis error
    expect(res.status).toBe(200)
  })

  it('10. Hasura error: returns 500', async () => {
    vi.stubGlobal('fetch', makeHasuraMock({ shouldFail: true }))
    const { POST } = await import('../src/pages/api/feedback')
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
    const { POST } = await import('../src/pages/api/feedback')
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
    const { POST } = await import('../src/pages/api/feedback')
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
