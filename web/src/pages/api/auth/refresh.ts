/**
 * api/auth/refresh.ts — access-token refresh proxy.
 *
 * PURPOSE: POST /api/auth/refresh — reads the refresh token from the httpOnly
 *   cookie, exchanges it with Hasura Auth, and re-sets both cookies with the
 *   new tokens. Callers should invoke this on a timer before the access
 *   token expires — no tokens ever touch client JS.
 * INPUTS: none — the refresh token comes from the ci_refresh_token cookie.
 * OUTPUTS: 200 { user, accessTokenExpiresAt } on success; 401/502 { error }
 *   (cookies cleared on failure so the client falls back to signed-out UI).
 * REF: no-localstorage-token fix, ported from praycalc (2026-07)
 */

import type { APIRoute } from 'astro'
import { refreshWithToken } from '@/lib/auth/hasura.server'
import { setAuthCookies, clearAuthCookies, readRefreshToken } from '@/lib/auth/cookies.server'

export const prerender = false

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ cookies }) => {
  const refreshToken = readRefreshToken(cookies)
  if (!refreshToken) {
    return json({ error: 'Not authenticated.' }, 401)
  }

  const result = await refreshWithToken(refreshToken)
  if (!result.ok) {
    clearAuthCookies(cookies)
    return json({ error: result.message }, result.status)
  }

  setAuthCookies(cookies, result.session)
  const expiresIn = result.session.accessTokenExpiresIn ?? 900
  return json(
    {
      user: {
        id: result.session.user.id ?? '',
        email: result.session.user.email ?? '',
        displayName:
          result.session.user.displayName ||
          result.session.user.email?.split('@')[0] ||
          '',
      },
      accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    },
    200,
  )
}
