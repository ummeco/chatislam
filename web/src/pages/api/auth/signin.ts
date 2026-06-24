// src/pages/api/auth/signin.ts — Astro SSR port of app/api/auth/signin/route.ts
// T09 (SEC-HARDENING) + T03 (P2-E5 Zod validation)
// Server-side proxy for Hasura Auth signin with Cloudflare Turnstile verification.
// Replaces the direct client→Hasura Auth call in SignInClient.tsx.
//
// Accepts:  POST { email, password, turnstileToken }
// Returns:  { session: { accessToken, refreshToken, accessTokenExpiresIn } } | { error }

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { verifyTurnstileToken } from '@/lib/turnstile'

export const prerender = false

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.ummat.dev'

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
})

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.json().catch(() => null)
  const parsed = SigninSchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const body = parsed.data

  // T09: Turnstile verification — fail closed in production, warn in dev.
  const isProd = process.env.NODE_ENV === 'production'
  const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '')
  if (!turnstileOk && isProd) {
    return new Response(JSON.stringify({ error: 'Bot check failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Proxy to Hasura Auth
  const authRes = await fetch(`${AUTH_URL}/v1/auth/signin/email-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }).catch(() => null)

  if (!authRes) {
    return new Response(JSON.stringify({ error: 'Auth service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = (await authRes.json().catch(() => ({}))) as Record<string, unknown>

  if (!authRes.ok) {
    return new Response(
      JSON.stringify({
        error: (data.message as string) ?? (data.error as string) ?? 'Sign in failed',
      }),
      { status: authRes.status, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
