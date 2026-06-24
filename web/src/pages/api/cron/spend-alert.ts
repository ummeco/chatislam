/**
 * src/pages/api/cron/spend-alert.ts — Astro SSR endpoint (ported from app/api/cron/spend-alert)
 *
 * ChatIslam — Daily Spend Alert Cron (SCI-05)
 *
 * Vercel cron: runs at 23:00 UTC daily.
 * Sums token spend across active sessions, estimates USD cost.
 * If estimated spend > SPEND_ALERT_THRESHOLD_USD → alert email via Elastic Email.
 *
 * Secured by CRON_SECRET header (Vercel automatically sets Authorization: Bearer <CRON_SECRET>).
 */

import type { APIRoute } from 'astro'
import { Sentry } from '../../../lib/sentry'
import { requireCronAuth } from '../../../../lib/cron-auth'

export const prerender = false

const HASURA_ENDPOINT     = process.env.HASURA_ENDPOINT     ?? 'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''
const ELASTIC_EMAIL_API   = process.env.ELASTIC_EMAIL_ADMIN_API_KEY ?? ''
const ALERT_EMAIL         = process.env.ALERT_EMAIL         ?? 'info@ussunnah.org'
const SPEND_ALERT_USD     = Number(process.env.SPEND_ALERT_THRESHOLD_USD ?? '10')
const FROM_EMAIL          = 'noreply@chatislam.org'

// Pricing constants (claude-sonnet-4-6)
const PRICE_INPUT_PER_MTK   = 3.00
const PRICE_OUTPUT_PER_MTK  = 15.00

// ─── Hasura: sum tokens for today ─────────────────────────────────────────────

interface TokenRow { anthropic_input_tokens: number; anthropic_output_tokens: number }

async function fetchTodayTokens(): Promise<{ inputTokens: number; outputTokens: number }> {
  const today = new Date().toISOString().slice(0, 10)

  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: `
        query DailyTokenSum($today: date!) {
          ci_messages_aggregate(
            where: {
              created_at: { _gte: $today }
              role: { _eq: "assistant" }
              anthropic_input_tokens: { _is_null: false }
            }
          ) {
            aggregate {
              sum {
                anthropic_input_tokens
                anthropic_output_tokens
              }
            }
          }
        }
      `,
      variables: { today },
    }),
  })

  const json = await res.json() as {
    data?: {
      ci_messages_aggregate?: {
        aggregate?: { sum?: { anthropic_input_tokens?: number; anthropic_output_tokens?: number } }
      }
    }
  }

  const sum = json.data?.ci_messages_aggregate?.aggregate?.sum
  return {
    inputTokens:  sum?.anthropic_input_tokens  ?? 0,
    outputTokens: sum?.anthropic_output_tokens ?? 0,
  }
}

// ─── Elastic Email alert ─────────────────────────────────────────────────────

async function sendSpendAlert(estimatedUsd: number, inputTokens: number, outputTokens: number): Promise<void> {
  if (!ELASTIC_EMAIL_API) return

  const today   = new Date().toISOString().slice(0, 10)
  const subject = `[ChatIslam] Daily spend alert — $${estimatedUsd.toFixed(2)} (${today})`
  const body    = [
    `ChatIslam daily spend alert — ${today}`,
    '',
    `Estimated cost: $${estimatedUsd.toFixed(2)} USD`,
    `Threshold:      $${SPEND_ALERT_USD.toFixed(2)} USD`,
    '',
    `Input tokens:   ${inputTokens.toLocaleString()}`,
    `Output tokens:  ${outputTokens.toLocaleString()}`,
    '',
    'Review at: https://ummat.dev/admin/chatislam/spend',
  ].join('\n')

  const params = new URLSearchParams({
    apikey:          ELASTIC_EMAIL_API,
    from:            FROM_EMAIL,
    fromName:        'ChatIslam Alerts',
    to:              ALERT_EMAIL,
    subject,
    bodyText:        body,
    isTransactional: 'true',
  })

  await fetch('https://api.elasticemail.com/v2/email/send', {
    method: 'POST',
    body:   params,
  })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request }) => {
  // Auth: timing-safe CRON_SECRET verification (P2-E1-W01 Track E)
  const authError = requireCronAuth(request.headers.get('authorization'))
  if (authError) {
    return new Response(authError.body, {
      status:  authError.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { inputTokens, outputTokens } = await fetchTodayTokens()
    const estimatedUsd = (inputTokens / 1_000_000) * PRICE_INPUT_PER_MTK
                       + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTK

    const triggered = estimatedUsd > SPEND_ALERT_USD

    if (triggered) {
      await sendSpendAlert(estimatedUsd, inputTokens, outputTokens)
    }

    return new Response(
      JSON.stringify({
        ok:           true,
        estimatedUsd: Number(estimatedUsd.toFixed(4)),
        inputTokens,
        outputTokens,
        threshold:    SPEND_ALERT_USD,
        alertSent:    triggered,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    Sentry.captureException(err)
    console.error('[spend-alert cron] Error', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
