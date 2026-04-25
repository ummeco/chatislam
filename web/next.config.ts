import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.ummat.dev https://*.nself.org:8543 https://api.stripe.com wss:",
              "frame-src https://js.stripe.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

// withSentryConfig wraps Next.js config to upload source maps and enable tunnel route.
// Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT in Vercel env vars.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "ummeco",
  project: process.env.SENTRY_PROJECT ?? "chatislam-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
