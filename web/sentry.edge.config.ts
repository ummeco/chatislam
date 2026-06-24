import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry initialization for ChatIslam.
// Edge functions run in Cloudflare Workers-like environment — no Node.js APIs.
// DSN renamed to SENTRY_DSN per D-P2-OBS-3 (was GLITCHTIP_DSN — drift fix D1).
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',

  // Cost-controlled: 5% of edge transactions sampled.
  tracesSampleRate: 0.05,

  // Edge runtime does not support session replay.
})
