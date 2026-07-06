/**
 * api/auth/signout.ts — sign-out proxy.
 *
 * PURPOSE: POST /api/auth/signout — invalidates the refresh token with
 *   Hasura Auth (best-effort) and clears both auth cookies.
 * INPUTS: none — the refresh token comes from the ci_refresh_token cookie.
 * OUTPUTS: 200 { ok: true } always — sign-out clears local state regardless
 *   of whether the upstream invalidation call succeeds.
 * REF: no-localstorage-token fix, ported from praycalc (2026-07)
 */

import type { APIRoute } from 'astro'
import { signOutWithToken } from '@/lib/auth/hasura.server'
import { clearAuthCookies, readRefreshToken } from '@/lib/auth/cookies.server'

export const prerender = false

export const POST: APIRoute = async ({ cookies }) => {
  const refreshToken = readRefreshToken(cookies)

  if (refreshToken) {
    await signOutWithToken(refreshToken)
  }
  clearAuthCookies(cookies)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
