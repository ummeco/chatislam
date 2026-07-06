// src/pages/api/auth/signin.ts — Astro SSR port of app/api/auth/signin/route.ts
// T09 (SEC-HARDENING) + T03 (P2-E5 Zod validation)
// Server-side proxy for Hasura Auth signin with Cloudflare Turnstile verification.
//
// Tokens are set as httpOnly cookies server-side and never returned in the
// response body (no-localstorage-token fix, ported from praycalc/web).
//
// Accepts:  POST { email, password, turnstileToken }
// Returns:  { user: { id, email, displayName }, accessTokenExpiresAt } | { error }

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { signInEmailPassword } from '@/lib/auth/hasura.server'
import { setAuthCookies } from '@/lib/auth/cookies.server'

export const prerender = false

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
  const parsed = SigninSchema.safeParse(rawBody)
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

  const result = await signInEmailPassword(body.email, body.password)
  if (!result.ok) {
    return json({ error: result.message }, result.status)
  }

  setAuthCookies(cookies, result.session)
  const expiresIn = result.session.accessTokenExpiresIn ?? 900
  return json(
    {
      user: {
        id: result.session.user.id ?? '',
        email: result.session.user.email || body.email,
        // Leave blank when Hasura has no displayName on file — buildSession()
        // client-side derives a nicely-formatted one from the email local-part
        // (dots/underscores -> spaces). Don't duplicate that logic here.
        displayName: result.session.user.displayName ?? '',
      },
      accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    },
    200,
  )
}
