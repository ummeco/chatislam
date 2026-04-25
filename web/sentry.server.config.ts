import * as Sentry from '@sentry/nextjs'

// Server-side Sentry initialization for ChatIslam (Node.js runtime).
// Uses SENTRY_DSN (server-only; not prefixed with NEXT_PUBLIC_).
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  // PII scrubbing — strip sensitive fields before sending to Sentry.
  beforeSend(event) {
    // Scrub request data containing PII.
    if (event.request) {
      if (event.request.headers) {
        delete (event.request.headers as Record<string, unknown>)['authorization']
      }
      // Do not capture full request body — may contain user messages.
      delete event.request.data
    }
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
})
