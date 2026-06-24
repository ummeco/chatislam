/**
 * src/pages/api/widget/init.ts — Astro SSR endpoint (ported from app/api/widget/init)
 *
 * ChatIslam — Widget Init (SCI-16)
 *
 * Called by the widget on mount to get a session_id and config.
 * Returns the session_id which is passed back to the parent via postMessage.
 *
 * POST /api/widget/init
 * Body: { mode: string; origin: string }
 * Returns: { sessionId: string; mode: string }
 */

import type { APIRoute } from 'astro'
import crypto from 'crypto'

export const prerender = false

// Validation — T03 AC-01: Priority 2 validation at widget init boundary.
// Equivalent to the source zod schema { mode?: string, origin?: string }:
// keep only string-typed values, ignore everything else (safeParse fallback to {}).
interface WidgetInit { mode?: string; origin?: string }

function parseWidgetInit(raw: unknown): WidgetInit {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: WidgetInit = {}
  if (typeof r.mode === 'string') out.mode = r.mode
  if (typeof r.origin === 'string') out.origin = r.origin
  return out
}

const ALLOWED_ORIGINS = (process.env.WIDGET_ALLOWED_ORIGINS ?? 'ummat.app')
  .split(',')
  .map((o) => o.trim())

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false
  try {
    const url = new URL(origin.startsWith('http') ? origin : `https://${origin}`)
    const host = url.hostname
    return ALLOWED_ORIGINS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    )
  } catch {
    return false
  }
}

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin') ?? request.headers.get('referer') ?? ''

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not permitted' }), {
      status:  403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await request.json().catch(() => null)
  const body    = parseWidgetInit(rawBody ?? {})

  const validModes = ['Muslim', 'NewMuslim', 'NonMuslim']
  const mode       = validModes.includes(body.mode ?? '') ? body.mode! : 'Muslim'
  const sessionId  = crypto.randomUUID()

  return new Response(
    JSON.stringify({ sessionId, mode }),
    {
      status: 200,
      headers: {
        'Content-Type':                 'application/json',
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  )
}

export const OPTIONS: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin') ?? ''
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  isOriginAllowed(origin) ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
