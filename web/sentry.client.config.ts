import * as Sentry from '@sentry/nextjs'
import { scrubPII } from './lib/sentry-scrub'

// Client-side Sentry initialization for ChatIslam.
// DSN points to GlitchTip (self-hosted, Sentry-API-compatible). @sentry/nextjs SDK used as client.
// Read from NEXT_PUBLIC_SENTRY_DSN (renamed from NEXT_PUBLIC_GLITCHTIP_DSN per D-P2-OBS-3).
// No DSN → Sentry is a no-op; no error is thrown.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only active in production — avoids noise in local dev.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',

  // Cost-controlled: 5% of transactions sampled.
  tracesSampleRate: 0.05,

  // C-08a-FIX-P0: No session replays without explicit consent. Errors always captured.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,

  integrations: [
    // C-08a-FIX-P0: maskAllText + blockAllMedia required for privacy compliance.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  // SEC-M6 / T25.15: Full PII scrub — headers, body, user fields, extras, contexts.
  beforeSend: scrubPII,
})
