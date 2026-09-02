/**
 * verify-jwt.ts — Hasura JWT signature verification tests
 *
 * Mirrors ummat/app/web's siege-h1-jwt-session.test.ts (S12-03/H1). Verifies
 * that verifyHasuraUserId()/verifyHasuraUserIdFromHeader() reject:
 *   - tokens with a forged/invalid signature
 *   - expired tokens
 *   - malformed (non-JWT) tokens
 * and accept a properly signed, unexpired token — and that a missing
 * HASURA_GRAPHQL_JWT_SECRET fails closed (throws) rather than silently
 * trusting unverified claims.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'
import { verifyHasuraUserId, verifyHasuraUserIdFromHeader } from '../src/lib/auth/verify-jwt'

const TEST_SECRET = 'super-secret-test-key-for-verify-jwt-tests'
const USER_ID = 'test-user-abc123'

function secretBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

async function signToken(opts: {
  userId: string
  secret: string
  expiresIn?: number // seconds from now; negative = already expired
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (opts.expiresIn ?? 3600)

  return new SignJWT({
    sub: opts.userId,
    'https://hasura.io/jwt/claims': {
      'x-hasura-user-id': opts.userId,
      'x-hasura-default-role': 'user',
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretBytes(opts.secret))
}

// Forge a token signed with a different key — simulates an attacker who can
// write an arbitrary Authorization header / cookie value.
async function forgeToken(userId: string): Promise<string> {
  return signToken({ userId, secret: 'attacker-controlled-key', expiresIn: 3600 })
}

describe('verifyHasuraUserId() — JWT signature verification (H1)', () => {
  beforeEach(() => {
    process.env.HASURA_GRAPHQL_JWT_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.HASURA_GRAPHQL_JWT_SECRET
  })

  it('returns null for a missing token', async () => {
    expect(await verifyHasuraUserId(null)).toBeNull()
    expect(await verifyHasuraUserId(undefined)).toBeNull()
    expect(await verifyHasuraUserId('')).toBeNull()
  })

  it('returns the x-hasura-user-id claim for a valid signed token', async () => {
    const token = await signToken({ userId: USER_ID, secret: TEST_SECRET })
    expect(await verifyHasuraUserId(token)).toBe(USER_ID)
  })

  it('returns null for a token with a forged/invalid signature', async () => {
    const forged = await forgeToken(USER_ID)
    expect(await verifyHasuraUserId(forged)).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const expired = await signToken({ userId: USER_ID, secret: TEST_SECRET, expiresIn: -60 })
    expect(await verifyHasuraUserId(expired)).toBeNull()
  })

  it('returns null for a completely invalid (non-JWT) token', async () => {
    expect(await verifyHasuraUserId('not.a.jwt')).toBeNull()
  })

  it('throws when HASURA_GRAPHQL_JWT_SECRET is not set', async () => {
    delete process.env.HASURA_GRAPHQL_JWT_SECRET
    const token = await signToken({ userId: USER_ID, secret: TEST_SECRET })
    await expect(verifyHasuraUserId(token)).rejects.toThrow('HASURA_GRAPHQL_JWT_SECRET is not set')
  })
})

describe('verifyHasuraUserIdFromHeader() — Authorization header extraction', () => {
  beforeEach(() => {
    process.env.HASURA_GRAPHQL_JWT_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.HASURA_GRAPHQL_JWT_SECRET
  })

  function requestWithAuth(authHeader?: string): Request {
    return new Request('http://localhost/api/test', {
      headers: authHeader ? { authorization: authHeader } : {},
    })
  }

  it('returns null when there is no Authorization header', async () => {
    expect(await verifyHasuraUserIdFromHeader(requestWithAuth())).toBeNull()
  })

  it('returns null when the header is not a Bearer token', async () => {
    expect(await verifyHasuraUserIdFromHeader(requestWithAuth('Basic abc123'))).toBeNull()
  })

  it('returns the user id for a valid Bearer token', async () => {
    const token = await signToken({ userId: USER_ID, secret: TEST_SECRET })
    expect(await verifyHasuraUserIdFromHeader(requestWithAuth(`Bearer ${token}`))).toBe(USER_ID)
  })

  it('returns null for a forged Bearer token', async () => {
    const forged = await forgeToken(USER_ID)
    expect(await verifyHasuraUserIdFromHeader(requestWithAuth(`Bearer ${forged}`))).toBeNull()
  })
})
