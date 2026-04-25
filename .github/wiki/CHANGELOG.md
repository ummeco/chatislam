# Changelog

All notable changes to ChatIslam are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.1] - 2026-04-25

### Phase 1 Foundation

- Redis rate-limit adapter (5/30/100 req per window for anon/auth/token tiers)
- CORS allowlist controlled by `REMOTE_SCHEMA_ORIGINS` env var
- Per-app distinct `REMOTE_SCHEMA_SECRET` rotated and stored in vault
- Static routes: `/donate`, `/privacy`, `/terms`, `/cookies`
- Sentry error tracking and Umami analytics configuration
- 56 passing unit tests (audience-mode, escalation, rate-limit, route)

---

## [0.1.0] - 2026-04-13

### Initial Setup

- Project scaffolded: Next.js 15 App Router, TypeScript, Tailwind CSS
- Audience-adaptive chat modes: Muslim / New Muslim / Dawah (non-Muslim)
- Remote Schema endpoint (`/api/graphql`) with secret validation
- Connected to shared Ummat backend (`api.ummat.dev`)
- Vercel project `ummat-chatislam` linked to `chatislam.org`
