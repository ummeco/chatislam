/**
 * ChatIslam Widget — Embed Page (SCI-16)
 *
 * Route: /widget?mode=Muslim|NewMuslim|NonMuslim&origin=<host>
 *
 * Renders the ChatWidget component for iframe embedding.
 * origin is validated server-side against WIDGET_ALLOWED_ORIGINS.
 */

import ChatWidget from '../../components/widget/ChatWidget'

interface WidgetPageProps {
  searchParams: Promise<{ mode?: string; origin?: string; sessionId?: string }>
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const params    = await searchParams
  const rawMode   = params.mode ?? 'Muslim'
  const origin    = params.origin ?? ''
  const sessionId = params.sessionId ?? null

  const allowedOrigins = (process.env.WIDGET_ALLOWED_ORIGINS ?? 'ummat.app').split(',').map((o) => o.trim())

  // Validate mode
  const validModes = ['Muslim', 'NewMuslim', 'NonMuslim'] as const
  type WidgetMode = typeof validModes[number]
  const mode: WidgetMode = validModes.includes(rawMode as WidgetMode)
    ? (rawMode as WidgetMode)
    : 'Muslim'

  // Validate origin (informational — full enforcement via CSP headers in next.config.ts)
  const isAllowedOrigin = !origin || allowedOrigins.some(
    (allowed) => origin === allowed || origin.endsWith(`.${allowed}`),
  )

  if (!isAllowedOrigin) {
    return (
      <div style={{ padding: '1rem', color: '#C9F27A', fontSize: '0.875rem' }}>
        Origin not authorized.
      </div>
    )
  }

  return <ChatWidget mode={mode} sessionId={sessionId} />
}
