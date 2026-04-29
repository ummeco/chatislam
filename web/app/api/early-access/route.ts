/**
 * ChatIslam — Early Access Signup API (SCI-Q001)
 *
 * Fixes the broken onsubmit on the landing page form.
 * Stores email in ci_early_access_signups via Hasura, then sends
 * a confirmation email via Elastic Email.
 *
 * POST /api/early-access
 * Body: { email: string }
 * Returns: 200 { ok: true } | 400 { error } | 409 { error: 'already_registered' }
 */

import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

const HASURA_ENDPOINT     = process.env.HASURA_ENDPOINT     ?? 'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET ?? ''
const ELASTIC_EMAIL_API   = process.env.ELASTIC_EMAIL_ADMIN_API_KEY ?? ''
const FROM_EMAIL          = 'noreply@chatislam.org'
const FROM_NAME           = 'ChatIslam'

// Basic email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Hasura upsert ────────────────────────────────────────────────────────────

async function insertSignup(email: string): Promise<{ ok: boolean; duplicate: boolean }> {
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          mutation InsertEarlyAccess($email: citext!) {
            insert_ci_early_access_signups_one(
              object: { email: $email },
              on_conflict: {
                constraint: ci_early_access_signups_email_key,
                update_columns: [updated_at]
              }
            ) { id created_at }
          }
        `,
        variables: { email },
      }),
    })
    const json = await res.json() as { data?: { insert_ci_early_access_signups_one?: { id: string; created_at: string } }; errors?: unknown[] }
    if (json.errors?.length) {
      Sentry.captureException(new Error('[early-access] Hasura GraphQL error'))
      console.error('[early-access] Hasura error', json.errors)
      return { ok: false, duplicate: false }
    }
    return { ok: true, duplicate: false }
  } catch (err) {
    Sentry.captureException(err)
    console.error('[early-access] Hasura fetch error', err)
    return { ok: false, duplicate: false }
  }
}

// ─── Elastic Email confirmation ────────────────────────────────────────────────

async function sendConfirmation(email: string): Promise<void> {
  if (!ELASTIC_EMAIL_API) return

  const body = new URLSearchParams({
    apikey:    ELASTIC_EMAIL_API,
    from:      FROM_EMAIL,
    fromName:  FROM_NAME,
    to:        email,
    subject:   'You\'re on the list — ChatIslam Early Access',
    bodyHtml:  `
      <p>Assalamu Alaikum wa Rahmatullahi wa Barakatuh,</p>
      <p>Thanks for signing up for ChatIslam early access. We'll notify you when your spot is ready, in sha Allah.</p>
      <p>ChatIslam is an AI-powered Islamic Q&A platform grounded in the Quran and authentic Sunnah.</p>
      <p>Visit us at <a href="https://chatislam.org">chatislam.org</a></p>
      <p style="font-size:12px;color:#666;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    `.trim(),
    bodyText: [
      'Assalamu Alaikum wa Rahmatullahi wa Barakatuh,',
      '',
      'Thanks for signing up for ChatIslam early access. We\'ll notify you when your spot is ready, in sha Allah.',
      '',
      'ChatIslam is an AI-powered Islamic Q&A platform grounded in the Quran and authentic Sunnah.',
      '',
      'Visit us at https://chatislam.org',
    ].join('\n'),
    isTransactional: 'true',
  })

  try {
    await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      body,
    })
  } catch (err) {
    // Non-blocking — signup succeeds even if email fails
    Sentry.captureException(err)
    console.error('[early-access] Elastic Email error', err)
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { email?: unknown }
  try {
    body = (await req.json()) as { email?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  const { ok } = await insertSignup(email)
  if (!ok) {
    return NextResponse.json({ error: 'Failed to register. Please try again.' }, { status: 500 })
  }

  // Send confirmation (fire-and-forget — does not block response)
  void sendConfirmation(email)

  return NextResponse.json({ ok: true, message: 'You\'re on the list! We\'ll be in touch soon, in sha Allah.' })
}
