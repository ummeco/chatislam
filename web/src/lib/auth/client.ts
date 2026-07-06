/**
 * auth/client.ts — client-side auth calls for ChatIslam.
 *
 * PURPOSE: Talk to ChatIslam's own same-origin /api/auth/* proxy routes for
 *   anything that issues or refreshes tokens, so the tokens themselves are
 *   set as httpOnly cookies server-side and never reach this module. Ported
 *   from praycalc/web's client.ts (ADR-010-style fix); ChatIslam has no
 *   magic-link flow, so that exception does not apply here.
 * INPUTS: email/password from the sign-in/sign-up UI, or nothing
 *   (cookie-based refresh/sign-out).
 * OUTPUTS: AuthResult ({ user, accessTokenExpiresAt }) on success; throws an
 *   Error with a user-presentable .message on failure.
 * CONSTRAINTS: No Next.js imports, no Node/process.env — client-bundled.
 * REF: no-localstorage-token fix, ported from praycalc (2026-07)
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResult {
  user: AuthUser;
  /** Epoch ms when the server-side access-token cookie expires. */
  accessTokenExpiresAt: number;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed.');
  }
  return data as T;
}

/** Sign in with email + password. Tokens are set as httpOnly cookies server-side. */
export function signIn(email: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>('/api/auth/signin', { email, password });
}

/** Register a new account with email + password. */
export function signUp(email: string, password: string, displayName?: string): Promise<AuthResult> {
  return postJson<AuthResult>('/api/auth/signup', { email, password, displayName });
}

/** Refresh the access token. The refresh token comes from the httpOnly cookie. */
export function refreshSession(): Promise<AuthResult> {
  return postJson<AuthResult>('/api/auth/refresh');
}

/** Sign out (invalidate the refresh token + clear cookies). Best-effort — never throws. */
export async function signOut(): Promise<void> {
  try {
    await postJson('/api/auth/signout');
  } catch {
    // Best-effort. Session is cleared client-side regardless.
  }
}
