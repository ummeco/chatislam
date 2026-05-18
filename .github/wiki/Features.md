# Features

Last updated: 2026-05-18 (T06-P9 audit)

## Core Features

| Feature | Status | Notes |
| --- | --- | --- |
| Basic chat interface | Shipped | `/app/chat/page.tsx` — full message bubble, scroll, streaming |
| Claude AI integration | Shipped | `lib/ai-provider.ts` — Anthropic direct (D-P3-44); nself-ai migration Track A6 |
| Muslim mode (scholarly answers) | Shipped | `lib/audience-mode.ts` — madhab-aware system prompt |
| New Muslim mode (encouraging guidance) | Shipped | `lib/audience-mode.ts` — simplified, step-by-step tone |
| Dawah mode (bridge-building) | Shipped | `lib/audience-mode.ts` — "God" not "Allah", bridge-building framing |
| Islam.wiki data sourcing | Shipped | `lib/citation.ts` — corpus search, citation enrichment |
| Source citations | Shipped | `components/chat/CitationBadge.tsx` + `MadhabTagRow.tsx` |
| Rate limiting | Shipped | `middleware.ts` + `lib/rate-limit.ts` — Redis-backed, anon/auth/token tiers |
| User authentication | Shipped | Hasura Auth JWT, `auth.ummat.dev` SSO |
| User feedback loop | In Progress | `migrations/0002_message_feedback.sql` + `/api/feedback` route — awaiting DB migration apply (T04-P9) |
| IslamQA corpus import | In Progress | `migrations/0001_islamqa_tables.sql` + `scripts/import-islamqa.ts` — awaiting user-supplied JSON export (T03-P9) |
| Conversation history | Partial | Session stored in `ci_sessions` + `ci_messages`; history UI deferred to P10 |
| Human escalation to scholars | Partial | `/api/escalate` route exists; volunteer review queue UI is P10 scope |
| Embeddable JS widget | Planned | P10 scope |
| Admin feedback review queue | Partial | `/admin/feedback` stub page (T04-P9) — full admin UI (inline edit, bulk actions, filters) is P10 scope |

## i18n Support

| Locale | Status | Notes |
| --- | --- | --- |
| English (en) | Shipped | `messages/en.json` — complete |
| Arabic (ar) | Shipped | `messages/ar.json` — complete, RTL |
| Urdu (ur) | Shipped | `messages/ur.json` — complete, RTL |
| French (fr) | Partial | `messages/fr.json` — machine-translated stubs; theological review pending (T05-P9) |
| Turkish (tr) | Partial | `messages/tr.json` — machine-translated stubs; theological review pending (T05-P9) |
| Bengali (bn) | Partial | `messages/bn.json` — machine-translated stubs; theological review pending (T05-P9) |
| Indonesian (id) | Partial | `messages/id.json` — machine-translated stubs; theological review pending (T05-P9) |
| Malay (ms) | Partial | `messages/ms.json` — machine-translated stubs; theological review pending (T05-P9) |

## Merged from IslamQA

ChatIslam includes all functionality previously planned for IslamQA (islamqa.us):

| Feature | Status | Notes |
| --- | --- | --- |
| Fiqh Q&A with madhab-aware answers | Shipped | `lib/madhhab.ts` — Hanbali-first, 4 madhabs + Dhahiri |
| Ruling citations with evidence chains | Shipped | `lib/citation.ts` — structured citation, source URLs |
| Scholar consensus indicators | Shipped | `MadhabTagRow.tsx` — stance tags per school |
| IslamQA Q&A corpus | In Progress | DB tables ready; import awaiting user-supplied JSON export |

IslamQA (`islamqa.us`) redirects to chatislam.org.

## Security

| Feature | Status | Notes |
| --- | --- | --- |
| Input sanitization | Shipped | `lib/sanitize-input.ts` — HTML strip, length cap, injection block |
| Prompt injection guard | Shipped | `lib/aqeedah-guard.ts` — Islamic content policy enforcement |
| Spend guard | Shipped | `lib/spend-guard.ts` — per-session cost cap, Anthropic spend control |
| CSP headers | Shipped | `next.config.ts` — strict CSP, HSTS, frame-ancestors none |
| Secret scan CI gate | Shipped | `.github/workflows/security-secrets-check.yml` — OIDC token + API key patterns (T02-P9) |
| PII scrub on feedback | Shipped | `/api/feedback` — email/phone/SSN stripped before persist (T04-P9) |
