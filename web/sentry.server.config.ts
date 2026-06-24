import * as Sentry from '@sentry/nextjs'
import { scrubPII } from './lib/sentry-scrub'

// Server-side Sentry initialization for ChatIslam (Node.js runtime).
// DSN points to GlitchTip (self-hosted, Sentry-API-compatible). @sentry/nextjs SDK used as client.
// Uses SENTRY_DSN (renamed from GLITCHTIP_DSN per D-P2-OBS-3; server-only — not NEXT_PUBLIC_).
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  enabled: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',

  // Cost-controlled: 5% of transactions sampled.
  tracesSampleRate: 0.05,

  // SEC-M6 / T25.15: Full PII scrub — headers, body, user fields, extras, contexts.
  beforeSend: scrubPII,
})
