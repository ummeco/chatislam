/**
 * src/lib/turnstile.ts — Cloudflare Turnstile server-side verify
 *
 * PURPOSE: Verify Turnstile CAPTCHA tokens server-side on API routes.
 *   Fail-closed: returns false on any error including missing secret key.
 * INPUTS:  token (string from client widget)
 * OUTPUTS: boolean (true = verified human)
 * CONSTRAINTS:
 *   - No hCaptcha (D-P3-20 — Turnstile is canonical).
 *   - TURNSTILE_SECRET_KEY from vault only — never hardcoded.
 *   - Astro server-side only — not imported in islands.
 * REF: P2-E3-W02-S02-T02 · D-P3-20
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY not set — blocking (fail-closed)')
    return false
  }
  if (!token || token.trim() === '') return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    const res  = await fetch(SITEVERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
    if (!res.ok) return false
    const data = (await res.json()) as SiteverifyResponse
    return data.success === true
  } catch {
    return false
  }
}
