import * as Sentry from '@sentry/nextjs'

// Client-side Sentry initialization for ChatIslam.
// DSN is read from NEXT_PUBLIC_SENTRY_DSN (set in Vercel project: ummat-chatislam).
// No DSN → Sentry is a no-op; no error is thrown.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only active in production — avoids noise in local dev.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',

  // 10% of transactions for performance monitoring.
  tracesSampleRate: 0.1,

  // Capture all replays at error time; 1% for general session sampling.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
  ],

  // PII scrubbing — strip sensitive fields before sending to Sentry.
  beforeSend(event) {
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
  beforeSendTransaction(event) {
    return event
  },
})
