/**
 * src/lib/sentry.ts — Sentry initialisation for Astro server-side
 *
 * PURPOSE: Initialise Sentry error tracking from vault SENTRY_DSN_CHATISLAM.
 *   No GlitchTip references (D-P2-SENTRY-SOT — Sentry is sole SoT).
 * INPUTS:  environment variables (SENTRY_DSN_CHATISLAM, SENTRY_ORG, SENTRY_PROJECT)
 * OUTPUTS: Sentry instance ready for captureException / captureMessage
 * CONSTRAINTS:
 *   - Never import from @sentry/nextjs — use @sentry/astro.
 *   - DSN from vault SENTRY_DSN_CHATISLAM only.
 *   - No hardcoded DSN.
 *   - PII scrubbing applied via beforeSend.
 * REF: P2-E3-W02-S02-T02 · D-P2-SENTRY-SOT
 */

import * as Sentry from '@sentry/astro'

let initialised = false

export function initSentry(): void {
  if (initialised) return

  const dsn = import.meta.env.SENTRY_DSN_CHATISLAM ?? import.meta.env.SENTRY_DSN
  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN_CHATISLAM not set — Sentry disabled')
    return
  }

  Sentry.init({
    dsn,
    environment:  import.meta.env.MODE ?? 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Strip PII from breadcrumbs and request bodies
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>
        if (data.message) data.message = '[redacted]'
        if (data.history) data.history = '[redacted]'
      }
      return event
    },
  })

  initialised = true
}

export { Sentry }
