# Changelog

All notable changes to ChatIslam are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased — P7 Engineering Excellence Foundation] — 2026-05

> No version bump. P7 ships infrastructure cascade only.

### Changed

- Prompt-injection defenses hardened (T-P7-SIEGE carry-forward)
- Upstash adapter replaces in-memory rate limiter for multi-instance safety (from P4 — now confirmed in P7 baseline)
- Shared `@ummat/observability` workspace package consumed (otel-init + sentry-scrub)
- README updated with P7 status and CHANGELOG link (T-P7-DOC-08)

---

## [Unreleased — P4]

### Added

- ChatIslam beta: Tutor mode, Feynman method learning mode (CB-03)
- Dawah mode — audience-adaptive responses for non-Muslim conversations (CB-04)
- Seasonal mode theming — Ramadan, Eid al-Fitr, Eid al-Adha, Dhul Hijjah (CB-05)
- Conversation history persistence with session continuity (CB-07)
- Stream interruption recovery with partial stream cache (CB-08)
- Citation deep-link URL schema (P4-C07) — `islam.wiki/{corpus}/{collection}/...`
- Spend guard — server-side Claude API cost cap per user/session
- nSentry observability wiring (GlitchTip DSN + OTel instrumentation)

---

## [Unreleased] — 2026-05-03 (Wave A.15-RETRY)

### Fixed

- **H6 (ESLint brand path):** `eslint.config.mjs` import path `../../ummat/apps/brand/src/eslint-rule-no-brand-light-on-light.js` confirmed correct from `chatislam/web/`; resolves to `ummeco/ummat/apps/brand/src/`. Build exits 0.

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
