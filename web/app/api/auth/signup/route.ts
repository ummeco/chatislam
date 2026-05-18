// app/api/auth/signup/route.ts — T09 (SEC-HARDENING)
// Server-side proxy for Hasura Auth signup with Cloudflare Turnstile verification.
// Replaces the direct client→Hasura Auth call in SignUpClient.tsx.
//
// Accepts:  POST { email, password, turnstileToken }
// Returns:  { session?: { accessToken, refreshToken, accessTokenExpiresIn } } | { error }

import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstileToken } from '@/lib/turnstile'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.ummat.dev'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    email?: string
    password?: string
    turnstileToken?: string
  } | null

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // T09: Turnstile verification — fail closed in production, warn in dev.
  const isProd = process.env.NODE_ENV === 'production'
  const turnstileOk = await verifyTurnstileToken(body.turnstileToken ?? '')
  if (!turnstileOk && isProd) {
    return NextResponse.json({ error: 'Bot check failed' }, { status: 400 })
  }

  // Proxy to Hasura Auth
  const authRes = await fetch(`${AUTH_URL}/v1/auth/signup/email-password`, {
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
      { error: (data.message as string) ?? (data.error as string) ?? 'Registration failed' },
      { status: authRes.status },
    )
  }

  return NextResponse.json(data, { status: 200 })
}
