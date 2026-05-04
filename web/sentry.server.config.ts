import * as Sentry from '@sentry/nextjs'
import { scrubPII } from './lib/sentry-scrub'

// Server-side Sentry initialization for ChatIslam (Node.js runtime).
// Uses SENTRY_DSN (server-only; not prefixed with NEXT_PUBLIC_).
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  // SEC-M6 / T25.15: Full PII scrub — headers, body, user fields, extras, contexts.
  beforeSend: scrubPII,
})
