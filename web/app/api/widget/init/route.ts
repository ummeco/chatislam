/**
 * ChatIslam — Widget Init (SCI-16)
 *
 * Called by the widget on mount to get a session_id and config.
 * Returns the session_id which is passed back to the parent via postMessage.
 *
 * POST /api/widget/init
 * Body: { mode: string; origin: string }
 * Returns: { sessionId: string; mode: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'

// Zod schema — T03 AC-01: Priority 2 validation at widget init boundary
const WidgetInitSchema = z.object({
  mode:   z.string().optional(),
  origin: z.string().optional(),
})

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? ''

  if (!isOriginAllowed(origin)) {
    return NextResponse.json({ error: 'Origin not permitted' }, { status: 403 })
  }

  const rawBody = await req.json().catch(() => null)
  const parsedWidget = WidgetInitSchema.safeParse(rawBody ?? {})
  const body = parsedWidget.success ? parsedWidget.data : {}

  const validModes = ['Muslim', 'NewMuslim', 'NonMuslim']
  const mode       = validModes.includes(body.mode ?? '') ? body.mode! : 'Muslim'
  const sessionId  = crypto.randomUUID()

  return NextResponse.json(
    { sessionId, mode },
    {
      headers: {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  )
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  isOriginAllowed(origin) ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
