// FILE: astro.config.ts
// PURPOSE: Astro 5 configuration for chatislam.org
//
// Stack decision: D-P2-STACK-CANON — Astro for content/SEO, islands for interactive AI chat.
// @ummat/astro-preset: injects brand tokens CSS, RTL direction, urql SSR.
// Vercel adapter: SSR for API routes + Cloudflare Worker proxy.
//
// CONSTRAINTS:
//   - @vercel/astro adapter in hybrid mode: static landing pages + SSR for /api/* routes.
//   - React 19 islands via @astrojs/react (client:load for chat island).
//   - No Next.js, no next/* imports, no next.config.ts.
// REF: P2-E3-W02-S02-T02 · D-P2-STACK-CANON · ADR-002 (superseded)

import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel/serverless'
import { astroUmmat } from '@ummat/astro-preset'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://chatislam.org',
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false }, // Umami handles analytics (D-P3-21)
    imageService: true,
  }),
  integrations: [
    astroUmmat({
      injectBrandTokens: true,
      setRtlDirection: true,
      urqlSsr: true,
    }),
    react(),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar', 'ur', 'fa', 'fr', 'id', 'ms', 'tr', 'bn'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss() as any],
    build: {
      // @astrojs/react v5 uses destructuring params that esbuild can't lower
      // to legacy targets. Since Node >=22.12.0 is required, modern targets are safe.
      target: 'es2022',
      rollupOptions: {
        // ioredis is loaded via dynamic import only when REDIS_URL is set and
        // is resolved at runtime inside the Vercel serverless function. Mark it
        // external so rollup does not try (and fail) to resolve it at build time.
        external: [/^ioredis$/, /^ioredis\//],
      },
    },
    esbuild: {
      // Prevent esbuild from attempting to lower modern JS to legacy targets
      // @astrojs/react v5 requires Node >=22.12.0, so modern syntax is safe
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
    define: {
      // Expose public env vars to client islands
      'import.meta.env.PUBLIC_HASURA_URL': JSON.stringify(process.env.PUBLIC_HASURA_URL ?? ''),
      'import.meta.env.PUBLIC_AUTH_URL': JSON.stringify(process.env.PUBLIC_AUTH_URL ?? ''),
      'import.meta.env.PUBLIC_BASE_URL': JSON.stringify(process.env.PUBLIC_BASE_URL ?? 'https://chatislam.org'),
      'import.meta.env.PUBLIC_TURNSTILE_SITE_KEY': JSON.stringify(process.env.PUBLIC_TURNSTILE_SITE_KEY ?? ''),
      'import.meta.env.PUBLIC_UMAMI_WEBSITE_ID': JSON.stringify(process.env.PUBLIC_UMAMI_WEBSITE_ID ?? ''),
    },
    ssr: {
      // These modules must stay server-side only and are resolved at runtime
      // inside the Vercel serverless function (not bundled by rollup).
      // ioredis is a transitive runtime dep loaded via dynamic import in
      // src/pages/api/feedback.ts and rate-limit code; externalize so the
      // server entrypoint build does not try to resolve it at bundle time.
      noExternal: [],
      external: ['@anthropic-ai/sdk', 'ioredis'],
    },
  },
})
