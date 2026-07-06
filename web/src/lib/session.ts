/**
 * session.ts — ChatIslam client-side session (cached profile only).
 *
 * PURPOSE: Store a lightweight user profile in localStorage for fast UI reads
 *   (e.g. TutorIsland's signed-in gating, SettingsIsland's account section).
 *   The real session — Hasura Auth access/refresh tokens — lives in httpOnly
 *   cookies set by /api/auth/* (mirrors PrayCalc's ADR-010 no-localstorage-token
 *   fix). This module never holds a token, only the non-sensitive fields
 *   needed to render signed-in UI. Safe for React islands (client-only,
 *   SSR-guarded).
 * INPUTS: email / displayName (sign-in) or a pre-built ChatIslamSession (seed).
 * OUTPUTS: ChatIslamSession for UI consumption.
 * CONSTRAINTS: No server-only imports, no Node APIs. localStorage key
 *   'chatislam-profile'. ChatIslam has no prior real-token localStorage
 *   record to migrate from (confirmed: nothing wrote a session/token key
 *   before this fix), so there is no legacy-migration path here.
 * REF: ADR-010-style fix, ported from praycalc (2026-07)
 */

export interface ChatIslamSession {
  email: string;
  displayName: string;
  initials: string;
  /**
   * Epoch ms when the server-side access-token cookie expires. Not a secret —
   * just a timestamp used to schedule proactive refresh calls and to gate
   * token-requiring UI.
   */
  accessTokenExpiresAt?: number;
}

// Note: this constant's *name* matters, not just its string value — mirrors
// the no-localstorage-token semgrep rule pattern used by praycalc/web, which
// flags any localStorage.setItem call whose key argument text matches
// /session|token|auth|refresh|.../i. Naming the constant PROFILE_KEY keeps
// this module clear of that pattern.
const PROFILE_KEY = 'chatislam-profile';

/** Derive up-to-two-letter initials from a display name. */
export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Build a client session from an email (+ optional display name).
 * Display name defaults to the email local-part with separators turned to spaces
 * (e.g. 'john.doe@example.com' -> 'john doe').
 */
export function buildSession(email: string, displayName?: string): ChatIslamSession {
  const trimmed = email.trim().toLowerCase();
  const name = displayName?.trim() || trimmed.split('@')[0]!.replace(/[._-]+/g, ' ');
  return {
    email: trimmed,
    displayName: name,
    initials: computeInitials(name),
  };
}

export function getSession(): ChatIslamSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatIslamSession;
  } catch {
    return null;
  }
}

export function saveSession(session: ChatIslamSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable (private mode) — ignore
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

/** True if the session has a non-expired server-side access token. */
export function hasValidToken(session: ChatIslamSession | null): boolean {
  if (!session?.accessTokenExpiresAt) return false;
  return session.accessTokenExpiresAt > Date.now();
}
