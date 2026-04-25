import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry initialization for ChatIslam.
// Edge functions run in Cloudflare Workers-like environment — no Node.js APIs.
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,
})
