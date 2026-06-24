import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from '@next/bundle-analyzer'
import createNextIntlPlugin from 'next-intl/plugin';

// P2-E6-W01-S01-T01: next-intl plugin wires up i18n/request.ts for locale detection.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// T12: Bundle analyzer — run with ANALYZE=true pnpm build
const analyzeBundles = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
  // Server-side packages that must not be bundled by webpack.
  // - ioredis: optional dep, used only when REDIS_URL is set
  // - @opentelemetry/*: sdk-node and auto-instrumentations pull in optional
  //   peer deps (exporter-jaeger, winston-transport) that may not be installed;
  //   externalising them lets Node.js require() them at runtime and avoids
  //   webpack bundling errors on missing optional peers.
  serverExternalPackages: [
    'ioredis',
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
    // NOTE: @ummat/consent is intentionally NOT in serverExternalPackages.
    // It is a client component package (CookieBanner, ConsentProvider use hooks).
    // Marking the whole package as serverExternal breaks SSR because Next.js then
    // imports it in a server context where React.useState is null (digest 70762509).
    // The server-only sub-entry (@ummat/consent/server) stays server-safe via the
    // exports map split — no special config needed.
  ],
  // T-P7-Q-PERF-06: AVIF first, WebP fallback. JPEG/PNG fallback handled by Next.js automatically.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
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
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
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
              "connect-src 'self' https://*.ummat.dev https://*.nself.org:8543 https://errors.ummat.dev wss:",
              'frame-src https://challenges.cloudflare.com',
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // T11: API routes must never be cached — prevent stale auth/data responses.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
};

// withSentryConfig wraps Next.js config to upload source maps to GlitchTip on build.
// T25.07: url points to self-hosted GlitchTip at errors.ummat.dev (not Sentry SaaS).
// Requires SENTRY_AUTH_TOKEN (=GLITCHTIP_AUTH_TOKEN), SENTRY_ORG, SENTRY_PROJECT in Vercel env vars.
export default withSentryConfig(withNextIntl(analyzeBundles(nextConfig)), {
  org: process.env.SENTRY_ORG ?? "ummeco",
  project: process.env.SENTRY_PROJECT ?? "chatislam-web",
  sentryUrl: 'https://errors.ummat.dev',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
});
