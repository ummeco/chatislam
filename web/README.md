# ChatIslam — Web App

AI-powered Islamic Q&A and dawah assistant at [chatislam.org](https://chatislam.org).
Grounded in Ahl us-Sunnah wal-Jamaah scholarship.

**Stack:** Astro 5 + TypeScript + Tailwind CSS + React 19 islands
**Migration:** Migrated from Next.js 15 → Astro 5 in P2-E3-W02-S02-T02 (D-P2-STACK-CANON, ADR-002 superseded)

## Architecture

```
src/
├── pages/          # Static Astro pages (homepage, legal, dawah, donate)
│   ├── index.astro # Landing (static, SEO-optimised, Lighthouse 95+)
│   ├── chat/       # Chat page shell (hybrid SSR for locale detection)
│   ├── dawah/      # Dawah landing (static)
│   ├── legal/      # Sharia disclaimer (static)
│   └── api/        # SSR endpoints (chat proxy, cron)
├── islands/        # React 19 client:load islands
│   └── ChatIsland.tsx  # AI chat — 7 UI states, Turnstile, RTL
├── layouts/        # BaseLayout.astro (brand tokens, RTL, Sentry, Umami)
├── components/     # Static Astro components (SiteNav, DisclaimerBanner)
├── lib/            # Server-side utilities (turnstile.ts, sentry.ts)
└── styles/         # global.css (Tailwind 4)
```

## Dev

```bash
pnpm install
pnpm dev      # http://localhost:3042
```

Local URL: `https://www.chatislam.local.nself.org:8543`

## Environment Variables

```env
# Client-exposed (PUBLIC_ prefix — Astro convention)
PUBLIC_HASURA_URL=https://api.chatislam.local.nself.org:8543/v1/graphql
PUBLIC_AUTH_URL=https://auth.local.nself.org:8543
PUBLIC_BASE_URL=https://www.chatislam.local.nself.org:8543
PUBLIC_TURNSTILE_SITE_KEY=   # Cloudflare Turnstile (D-P3-20)
PUBLIC_CHAT_PROXY_URL=/api/chat  # CF Worker in prod

# Server-only
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
TURNSTILE_SECRET_KEY=
SENTRY_DSN_CHATISLAM=        # Vault: SENTRY_DSN_CHATISLAM
REDIS_URL=redis://localhost:6379
```

See `.env.example` for full variable list.

## AI Safety

ChatIslam is not a mufti. AI responses are for informational purposes only — not fatwas.
Theology gate enforced in the Cloudflare Worker system prompt: Ahl us-Sunnah umbrella only.
Every response surfaces the scholar disclaimer.

## Key Decisions

| Decision | Status |
|---|---|
| D-P2-STACK-CANON | Astro 5 with islands for content-first apps |
| D-P3-20 | Cloudflare Turnstile (hCaptcha dropped) |
| D-P2-SENTRY-SOT | Sentry only (GlitchTip removed) |
| ADR-002-SUPERSEDED | Next.js exception formally superseded |

## Production

Vercel project: `ummat-chatislam` · Domain: `chatislam.org`
