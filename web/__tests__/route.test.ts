import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

function makeRequest(headers: Record<string, string>, body: unknown) {
  return new NextRequest('http://localhost/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/graphql — Remote Schema secret validation', () => {
  const SECRET = 'test-secret-abc123'

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('REMOTE_SCHEMA_SECRET', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when secret header is missing', async () => {
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest({}, { query: '{ _chatislam }' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.errors[0].message).toBe('Unauthorized')
  })

  it('returns 401 when secret header is wrong', async () => {
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest({ 'x-remote-schema-secret': 'wrong-secret' }, { query: '{ _chatislam }' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when REMOTE_SCHEMA_SECRET env is not set', async () => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.stubEnv('REMOTE_SCHEMA_SECRET', '')
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest({ 'x-remote-schema-secret': '' }, { query: '{ _chatislam }' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns introspection response for __schema query', async () => {
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest(
      { 'x-remote-schema-secret': SECRET },
      { query: '{ __schema { queryType { name } } }' }
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.__schema.queryType.name).toBe('Query')
  })

  it('returns introspection response for IntrospectionQuery', async () => {
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest(
      { 'x-remote-schema-secret': SECRET },
      { query: 'query IntrospectionQuery { __schema { types { name } } }' }
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.__schema).toBeDefined()
  })

  it('returns stub data for normal query', async () => {
    const { POST } = await import('../app/api/graphql/route')
    const req = makeRequest(
      { 'x-remote-schema-secret': SECRET },
      { query: '{ _chatislam }' }
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data._chatislam).toBeNull()
  })
})

describe('OPTIONS /api/graphql — CORS preflight (T0-08-04)', () => {
  it('returns 204 with allowed origin for Hasura prod', async () => {
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://api.ummat.dev' },
    })
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://api.ummat.dev')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-remote-schema-secret')
  })

  it('returns 204 with allowed origin for local dev (api.chatislam.local.nself.org:8543)', async () => {
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://api.chatislam.local.nself.org:8543' },
    })
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://api.chatislam.local.nself.org:8543'
    )
  })

  it('returns 204 with no ACAO header for unknown origin', async () => {
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com' },
    })
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('returns no ACAO header for browser origin (chatislam.org)', async () => {
    // RS endpoint is Hasura-to-Next — not called from the browser directly
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://chatislam.org' },
    })
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('allowed headers do NOT include x-hasura-admin-secret', async () => {
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://api.ummat.dev' },
    })
    const res = await OPTIONS(req)
    const headers = res.headers.get('Access-Control-Allow-Headers') ?? ''
    expect(headers.toLowerCase()).not.toContain('admin-secret')
  })

  it('allowed methods are POST and OPTIONS only', async () => {
    const { OPTIONS } = await import('../app/api/graphql/route')
    const req = new NextRequest('http://localhost/api/graphql', {
      method: 'OPTIONS',
      headers: { Origin: 'https://api.ummat.dev' },
    })
    const res = await OPTIONS(req)
    const methods = res.headers.get('Access-Control-Allow-Methods') ?? ''
    expect(methods).toContain('POST')
    expect(methods).toContain('OPTIONS')
    expect(methods.toUpperCase()).not.toContain('DELETE')
    expect(methods.toUpperCase()).not.toContain('PUT')
  })
})
