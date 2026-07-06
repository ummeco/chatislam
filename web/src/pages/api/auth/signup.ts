// src/pages/api/auth/signup.ts — Astro SSR port of app/api/auth/signup/route.ts
// T09 (SEC-HARDENING) + T03 (P2-E5 Zod validation)
// Server-side proxy for Hasura Auth signup with Cloudflare Turnstile verification.
//
// Tokens are set as httpOnly cookies server-side and never returned in the
// response body (no-localstorage-token fix, ported from praycalc/web).
//
// Accepts:  POST { email, password, displayName?, turnstileToken }
// Returns:  { user: { id, email, displayName }, accessTokenExpiresAt } | { error }

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { signUpEmailPassword } from '@/lib/auth/hasura.server'
import { setAuthCookies } from '@/lib/auth/cookies.server'

export const prerender = false

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional(),
  turnstileToken: z.string().optional(),
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const rawBody = await request.json().catch(() => null)
  const parsed = SignupSchema.safeParse(rawBody)
  if (!parsed.success) {
    return json({ error: 'invalid_input', details: parsed.error.flatten() }, 400)
  }
  const body = parsed.data

  // T09: Turnstile verification — fail closed in production, warn in dev.
  const isProd = process.env.NODE_ENV === 'production'
  const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '')
  if (!turnstileOk && isProd) {
    return json({ error: 'Bot check failed' }, 400)
  }

  const result = await signUpEmailPassword(body.email, body.password, body.displayName)
  if (!result.ok) {
    return json({ error: result.message }, result.status)
  }

  setAuthCookies(cookies, result.session)
  const expiresIn = result.session.accessTokenExpiresIn ?? 900
  const email = result.session.user.email || body.email
  return json(
    {
      user: {
        id: result.session.user.id ?? '',
        email,
        displayName: result.session.user.displayName || body.displayName || email.split('@')[0],
      },
      accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    },
    200,
  )
}
