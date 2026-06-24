/**
 * sentry.astro.config.ts — Sentry Astro integration config
 *
 * PURPOSE: Configure @sentry/astro for build-time source map upload.
 *   DSN from vault SENTRY_DSN_CHATISLAM (not GlitchTip — D-P2-SENTRY-SOT).
 * REF: P2-E3-W02-S02-T02 · D-P2-SENTRY-SOT
 *
 * IMPORTANT: This file is NOT a Sentry DSN — it configures the build plugin.
 * Runtime DSN comes from SENTRY_DSN_CHATISLAM env var.
 */

export default {
  org:     process.env.SENTRY_ORG     ?? 'ummeco',
  project: process.env.SENTRY_PROJECT ?? 'chatislam-web',
  // authToken from SENTRY_AUTH_TOKEN env var at build time only
  // DSN is NOT set here — it is read at runtime from SENTRY_DSN_CHATISLAM vault var
}
