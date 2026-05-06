import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry initialization for ChatIslam.
// Edge functions run in Cloudflare Workers-like environment — no Node.js APIs.
// DSN points to GlitchTip (self-hosted, Sentry-API-compatible). @sentry/nextjs SDK used as client.
Sentry.init({
  dsn: process.env.GLITCHTIP_DSN,

  enabled: !!process.env.GLITCHTIP_DSN && process.env.NODE_ENV === 'production',

  // Cost-controlled: 5% of edge transactions sampled.
  tracesSampleRate: 0.05,

  // Edge runtime does not support session replay.
})
