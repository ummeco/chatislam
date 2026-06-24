// app/api/auth/signin/route.ts — T09 (SEC-HARDENING) + T03 (P2-E5 Zod validation)
// Server-side proxy for Hasura Auth signin with Cloudflare Turnstile verification.
// Replaces the direct client→Hasura Auth call in SignInClient.tsx.
//
// Accepts:  POST { email, password, turnstileToken }
// Returns:  { session: { accessToken, refreshToken, accessTokenExpiresIn } } | { error }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTurnstileToken } from '@/lib/turnstile'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.ummat.dev'

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => null)
  const parsed = SigninSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  // T09: Turnstile verification — fail closed in production, warn in dev.
  const isProd = process.env.NODE_ENV === 'production'
  const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '')
  if (!turnstileOk && isProd) {
    return NextResponse.json({ error: 'Bot check failed' }, { status: 400 })
  }

  // Proxy to Hasura Auth
  const authRes = await fetch(`${AUTH_URL}/v1/auth/signin/email-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }).catch(() => null)

  if (!authRes) {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
  }

  const data = (await authRes.json().catch(() => ({}))) as Record<string, unknown>

  if (!authRes.ok) {
    return NextResponse.json(
      { error: (data.message as string) ?? (data.error as string) ?? 'Sign in failed' },
      { status: authRes.status },
    )
  }

  return NextResponse.json(data, { status: 200 })
}
