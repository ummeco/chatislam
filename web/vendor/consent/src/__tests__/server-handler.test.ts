/**
 * S-C-S05-T05c — Tests for the shared consent server handler.
 *
 * Covers:
 *   • parseConsentBody — legacy + spec shapes, validation errors
 *   • isSameOrigin — Sec-Fetch-Site + Origin/Host signals
 *   • makeFingerprintHash — SHA-256, no raw PII
 *   • handleConsentRequest — POST happy path, GET, DELETE, CSRF rejection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  parseConsentBody,
  isSameOrigin,
  makeFingerprintHash,
  clientIpFromHeaders,
  handleConsentRequest,
  ConsentValidationError,
} from '../server-handler.js'

describe('parseConsentBody', () => {
  it('accepts the spec shape (categories + policy_version)', () => {
    const out = parseConsentBody({
      categories: { analytics: true, marketing: false, functional: true },
      policy_version: '1.0.0',
      locale: 'en',
    })
    expect(out.categories.analytics).toBe(true)
    expect(out.policyVersion).toBe('1.0.0')
    expect(out.locale).toBe('en')
  })

  it('accepts the legacy client shape (base64 ConsentRecord)', () => {
    const record = {
      version: '1.0.0',
      timestamp: Date.now(),
      categories: { analytics: false, marketing: false, functional: true },
      doNotTrack: false,
      doNotSell: false,
      explicit: true,
    }
    const encoded = Buffer.from(JSON.stringify(record)).toString('base64')
    const out = parseConsentBody({ consent: encoded })
    expect(out.policyVersion).toBe('1.0.0')
    expect(out.categories.functional).toBe(true)
  })

  it('rejects missing categories', () => {
    expect(() => parseConsentBody({ policy_version: '1.0.0' })).toThrowError(
      ConsentValidationError
    )
  })

  it('rejects malformed categories', () => {
    expect(() =>
      parseConsentBody({ categories: { analytics: 'yes' }, policy_version: '1.0.0' })
    ).toThrowError(ConsentValidationError)
  })

  it('rejects missing policy_version', () => {
    expect(() =>
      parseConsentBody({ categories: { analytics: true, marketing: true, functional: true } })
    ).toThrowError(ConsentValidationError)
  })

  it('rejects non-object body', () => {
    expect(() => parseConsentBody(null)).toThrowError(ConsentValidationError)
    expect(() => parseConsentBody('string')).toThrowError(ConsentValidationError)
  })
})

describe('isSameOrigin', () => {
  it('returns true for same-origin Sec-Fetch-Site', () => {
    const h = new Headers({ 'sec-fetch-site': 'same-origin' })
    expect(isSameOrigin(h)).toBe(true)
  })

  it('returns true for same-site Sec-Fetch-Site', () => {
    const h = new Headers({ 'sec-fetch-site': 'same-site' })
    expect(isSameOrigin(h)).toBe(true)
  })

  it('returns false for cross-site Sec-Fetch-Site', () => {
    const h = new Headers({ 'sec-fetch-site': 'cross-site' })
    expect(isSameOrigin(h)).toBe(false)
  })

  it('falls back to Origin vs Host comparison', () => {
    const ok = new Headers({ origin: 'https://ummat.app', host: 'ummat.app' })
    expect(isSameOrigin(ok)).toBe(true)
    const bad = new Headers({ origin: 'https://evil.example', host: 'ummat.app' })
    expect(isSameOrigin(bad)).toBe(false)
  })

  it('allows requests with no Origin and no Sec-Fetch-Site (server-to-server)', () => {
    const h = new Headers({})
    expect(isSameOrigin(h)).toBe(true)
  })
})

describe('makeFingerprintHash', () => {
  it('returns SHA-256 of UA+IP', () => {
    const h = makeFingerprintHash('Mozilla/5.0', '203.0.113.5')
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns null when both inputs empty', () => {
    expect(makeFingerprintHash(null, null)).toBeNull()
    expect(makeFingerprintHash('', '')).toBeNull()
  })

  it('produces deterministic output', () => {
    const a = makeFingerprintHash('Mozilla/5.0', '203.0.113.5')
    const b = makeFingerprintHash('Mozilla/5.0', '203.0.113.5')
    expect(a).toBe(b)
  })
})

describe('clientIpFromHeaders', () => {
  it('prefers cf-connecting-ip', () => {
    const h = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8',
    })
    expect(clientIpFromHeaders(h)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const h = new Headers({ 'x-real-ip': '9.9.9.9' })
    expect(clientIpFromHeaders(h)).toBe('9.9.9.9')
  })

  it('parses first IP from x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1' })
    expect(clientIpFromHeaders(h)).toBe('10.0.0.1')
  })

  it('returns null when no headers', () => {
    expect(clientIpFromHeaders(new Headers({}))).toBeNull()
  })
})

describe('handleConsentRequest', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    // Mock Hasura admin endpoint
    global.fetch = vi.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      // Policy lookup
      if (body.query?.includes('LatestCookiePolicy')) {
        return new Response(
          JSON.stringify({
            data: {
              lg_policy_version: [{ id: 'pol-uuid-1', version_semver: '1.0.0' }],
            },
          }),
          { status: 200 }
        )
      }
      // Insert mutation
      if (body.query?.includes('InsertConsent')) {
        return new Response(
          JSON.stringify({
            data: {
              insert_lg_consent_record: { returning: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }] },
            },
          }),
          { status: 200 }
        )
      }
      // GET latest
      if (body.query?.includes('LatestConsent')) {
        return new Response(
          JSON.stringify({
            data: {
              lg_consent_record: [
                { consent_type: 'cookie_banner_accept', granted: true, granted_at: '2026-05-11T00:00:00Z' },
              ],
            },
          }),
          { status: 200 }
        )
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('POST writes records and returns ok', async () => {
    const result = await handleConsentRequest({
      method: 'POST',
      headers: new Headers({ 'sec-fetch-site': 'same-origin' }),
      body: {
        categories: { analytics: true, marketing: false, functional: true },
        policy_version: '1.0.0',
      },
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(200)
    expect(result.body.ok).toBe(true)
    expect(result.body.recordIds).toEqual(['r1', 'r2', 'r3'])
  })

  it('POST rejects cross-origin', async () => {
    const result = await handleConsentRequest({
      method: 'POST',
      headers: new Headers({ 'sec-fetch-site': 'cross-site' }),
      body: { categories: { analytics: true, marketing: true, functional: true }, policy_version: '1.0.0' },
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(403)
    expect(result.body.code).toBe('CSRF')
  })

  it('POST rejects malformed payload with 400', async () => {
    const result = await handleConsentRequest({
      method: 'POST',
      headers: new Headers({ 'sec-fetch-site': 'same-origin' }),
      body: { categories: {} },
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('BAD_REQUEST')
  })

  it('GET returns current consent', async () => {
    const result = await handleConsentRequest({
      method: 'GET',
      headers: new Headers({}),
      userId: 'user-1',
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(200)
    expect(result.body.ok).toBe(true)
  })

  it('DELETE withdraws consent', async () => {
    const result = await handleConsentRequest({
      method: 'DELETE',
      headers: new Headers({ 'sec-fetch-site': 'same-origin' }),
      userId: 'user-1',
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(200)
    expect(result.body.withdrawn).toBe(true)
  })

  it('returns 405 for unsupported methods', async () => {
    const result = await handleConsentRequest({
      method: 'PATCH' as 'POST',
      headers: new Headers({ 'sec-fetch-site': 'same-origin' }),
      domain: 'ummat.app',
      hasura: { endpoint: 'http://hasura.test', adminSecret: 'admin' },
    })
    expect(result.status).toBe(405)
  })
})
