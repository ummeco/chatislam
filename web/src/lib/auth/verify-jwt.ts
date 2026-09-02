/**
 * verify-jwt.ts — shared Hasura JWT signature verification.
 *
 * Every server-side route that reads x-hasura-user-id out of a bearer token
 * must go through this helper. Decoding the base64 JWT payload without calling
 * jwtVerify() lets any caller forge an unsigned token claiming to be any user
 * (no signature check = full auth bypass). Mirrors ummat/app/web's
 * getSession() reference pattern (S12-03/H1): HS256 only, fails CLOSED — a
 * missing HASURA_GRAPHQL_JWT_SECRET re-throws instead of silently treating the
 * request as unauthenticated, so a misconfigured deployment cannot end up
 * trusting unverified claims.
 */

import { jwtVerify } from 'jose'

function getJwtSecret(): Uint8Array {
  const raw = process.env.HASURA_GRAPHQL_JWT_SECRET
  if (!raw) {
    throw new Error('HASURA_GRAPHQL_JWT_SECRET is not set — cannot verify session JWT')
  }
  return new TextEncoder().encode(raw)
}

/**
 * Verify a raw JWT string and return its x-hasura-user-id (falling back to
 * `sub`). Returns null for a missing/malformed/expired/forged token. Re-throws
 * when HASURA_GRAPHQL_JWT_SECRET is unset (hard startup failure, not an auth
 * decision).
 */
export async function verifyHasuraUserId(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    const p = payload as Record<string, unknown>
    const claims = p['https://hasura.io/jwt/claims'] as Record<string, unknown> | undefined
    const userId = (claims?.['x-hasura-user-id'] as string | undefined) ?? (payload.sub as string | undefined)
    return userId ?? null
  } catch (err) {
    if (err instanceof Error && err.message.includes('HASURA_GRAPHQL_JWT_SECRET')) {
      throw err
    }
    return null
  }
}

/** Convenience: verify the `Authorization: Bearer <token>` header of a Request. */
export async function verifyHasuraUserIdFromHeader(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyHasuraUserId(auth.slice(7))
}
