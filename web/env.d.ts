/// <reference path=".astro/types.d.ts" />
/// <reference types="astro/client" />

// Astro per-request locals — populated by src/middleware.ts.
declare namespace App {
  interface Locals {
    /** Active UI locale resolved from NEXT_LOCALE cookie / Accept-Language. */
    locale: string
  }
}

// Window.umami — Umami analytics (D-P3-21). Optional because consent-gated.
// Mirrors root types/umami.d.ts so islands under src/ resolve the global.
interface Window {
  umami?: {
    track: (event: string, data?: Record<string, unknown>) => void
    identify?: (userId: string) => void
  }
}

interface ImportMetaEnv {
  // Hasura GraphQL endpoint (per-app CORS-restricted)
  readonly PUBLIC_HASURA_URL: string
  // Auth endpoint (shared SSO)
  readonly PUBLIC_AUTH_URL: string
  // App base URL
  readonly PUBLIC_BASE_URL: string
  // Cloudflare Turnstile site key (D-P3-20)
  readonly PUBLIC_TURNSTILE_SITE_KEY: string
  // Chat proxy URL — defaults to /api/chat (Astro SSR, this app).
  // Override in production to point to an external CF Worker if one is provisioned.
  readonly PUBLIC_CHAT_PROXY_URL: string
  // Umami analytics (D-P3-21)
  readonly PUBLIC_UMAMI_WEBSITE_ID: string

  // Server-side only (never expose to browser)
  readonly TURNSTILE_SECRET_KEY: string
  readonly ANTHROPIC_API_KEY: string
  readonly ANTHROPIC_MODEL: string
  readonly AI_PROVIDER: string
  readonly REDIS_URL: string
  readonly SENTRY_DSN: string
  readonly SENTRY_DSN_CHATISLAM: string
  readonly SENTRY_AUTH_TOKEN: string
  readonly SENTRY_ORG: string
  readonly SENTRY_PROJECT: string
  readonly HASURA_ADMIN_URL: string
  readonly HASURA_ADMIN_SECRET: string
  readonly REMOTE_SCHEMA_SECRET: string
  readonly CHAT_DAILY_TOKEN_CAP: string
  readonly FF_MADHHAB: string
  readonly FF_DAWAH_MODE: string
  readonly FF_SEASONAL_MODE: string
  readonly FF_CONVERSATION_HISTORY: string
  readonly FF_FEYNMAN_AGENT: string
  readonly AUTH_CLIENT_URL: string
  readonly WIDGET_ALLOWED_ORIGINS: string
  readonly CRON_SECRET: string
  readonly SPEND_ALERT_THRESHOLD_USD: string
  readonly ALERT_EMAIL: string
  readonly ISLAMWIKI_BASE_URL: string
  readonly ISLAMWIKI_CITATION_API: string
  readonly OTEL_EXPORTER_OTLP_ENDPOINT: string
  readonly OTEL_SERVICE_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
