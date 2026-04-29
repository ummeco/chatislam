import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ioredis is an optional server-side dep used only when REDIS_URL is set.
  // Mark it as external so webpack doesn't try to bundle it (avoids build
  // errors when the package isn't installed in the Vercel environment).
  serverExternalPackages: ['ioredis'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            // B5-10: CSP hardened — removed 'unsafe-eval' (not needed for ChatIslam)
            // Anthropic API calls are server-side only (Route Handlers) — not in CSP
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.ummat.dev https://*.nself.org:8543 https://*.sentry.io https://*.ingest.sentry.io wss:",
              'frame-src https://challenges.cloudflare.com',
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

// withSentryConfig wraps Next.js config to upload source maps and enable tunnel route.
// Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT in Vercel env vars.
// B5-09: Source maps uploaded to Sentry on Vercel deploy, deleted from bundle after.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "ummeco",
  project: process.env.SENTRY_PROJECT ?? "chatislam-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
});
