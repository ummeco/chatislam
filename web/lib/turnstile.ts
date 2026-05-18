/**
 * ChatIslam — Cloudflare Turnstile server-side verification
 *
 * T09 (SEC-HARDENING): CAPTCHA on all auth endpoints (D-P3-20 canonical).
 *
 * Usage:
 *   import { verifyTurnstileToken } from '@/lib/turnstile'
 *   const ok = await verifyTurnstileToken(token)
 *   if (!ok) return NextResponse.json({ error: 'Bot check failed' }, { status: 400 })
 *
 * Reads TURNSTILE_SECRET_KEY from process.env.
 * Fail-closed: returns false on ANY error including missing key.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not set — blocking request (fail closed)')
    return false
  }

  if (!token || typeof token !== 'string' || token.trim() === '') return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) return false

    const data = (await res.json()) as SiteverifyResponse
    return data.success === true
  } catch {
    return false
  }
}
