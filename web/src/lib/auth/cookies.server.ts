/**
 * cookies.server.ts — httpOnly cookie helpers for Hasura Auth tokens.
 *
 * PURPOSE: Set/read/clear the access + refresh token cookies shared by every
 *   /api/auth/* route, so all routes agree on the same names and attributes.
 *   Tokens live only in httpOnly cookies, never in client-readable storage
 *   (ported from praycalc/web's ADR-010 no-localstorage-token fix).
 * INPUTS: Astro's `cookies` (AstroCookies) + token/expiry values from Hasura Auth.
 * OUTPUTS: cookies mutated in place; read helpers return the raw token string.
 * CONSTRAINTS: Server-only. TTLs mirror ummat/backend's shared Hasura Auth
 *   config (AUTH_ACCESS_TOKEN_EXPIRES_IN=900, AUTH_REFRESH_TOKEN_EXPIRES_IN=2592000)
 *   so cookie lifetime never outlives the token it holds.
 * REF: no-localstorage-token fix, ported from praycalc (2026-07)
 */

import type { AstroCookies } from 'astro';

export const ACCESS_TOKEN_COOKIE = 'ci_access_token';
export const REFRESH_TOKEN_COOKIE = 'ci_refresh_token';

const ACCESS_TOKEN_TTL_SECONDS = 900;
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000; // 30 days

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export interface AuthCookieTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires, from the auth server's response. */
  accessTokenExpiresIn?: number;
}

/** Set both auth cookies after a successful sign-in/sign-up/refresh. */
export function setAuthCookies(cookies: AstroCookies, tokens: AuthCookieTokens): void {
  cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    cookieOptions(tokens.accessTokenExpiresIn ?? ACCESS_TOKEN_TTL_SECONDS),
  );
  cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_TTL_SECONDS));
}

/** Clear both auth cookies (sign-out, or a refresh that fails outright). */
export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete(ACCESS_TOKEN_COOKIE, { path: '/' });
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' });
}

export function readAccessToken(cookies: AstroCookies): string | undefined {
  return cookies.get(ACCESS_TOKEN_COOKIE)?.value;
}

export function readRefreshToken(cookies: AstroCookies): string | undefined {
  return cookies.get(REFRESH_TOKEN_COOKIE)?.value;
}
