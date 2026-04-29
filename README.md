# ChatIslam

AI-powered Islamic knowledge chat and dawah platform. Authentic answers sourced from Quran, Hadith, and classical scholarship.

**Live:** [chatislam.org](https://chatislam.org)

> IslamQA (islamqa.us) has merged into ChatIslam. All Q&A functionality is available here.

## Features

- AI chat powered by Claude with strict Ahl us-Sunnah wal-Jamaah guidelines
- Audience-adaptive modes:
  - **Muslim mode** — scholarly, cited answers with source references
  - **New Muslim mode** — step-by-step guidance, encouraging tone
  - **Dawah mode** — gentle, bridge-building for non-Muslim audiences
- Source citations from Islam.wiki knowledge base
- Embeddable JS widget for partner websites
- Human escalation to vetted scholars and volunteers
- Chat history and session persistence (Hasura-backed, `ci_` table prefix)
- Rate limiting and prompt-injection defense on all AI routes

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend platform | nSelf (100% — self-hosted PaaS on Hetzner) |
| API | Hasura GraphQL Engine (all data access via GraphQL, no direct SQL) |
| Auth | Hasura Auth — shared SSO at auth.ummat.dev |
| AI | Anthropic Claude (Sonnet 4.x) — server-side Route Handlers only |
| Deploy | Vercel (project: ummat-chatislam) |

## Project Structure

```
chatislam/
└── web/        chatislam.org — Next.js web app
    └── app/    pages and API routes
```

## Getting Started

### Prerequisites

Start the shared Ummat backend first:

```bash
cd ~/Sites/ummeco/ummat/backend && nself start
```

### Web App

```bash
cd web
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY + Hasura/auth URLs
pnpm install
pnpm dev --port 3042   # https://www.chatislam.local.nself.org:8543 (port 8543)
```

`ANTHROPIC_API_KEY` is required for all Claude API routes. The key must never be set in any `NEXT_PUBLIC_*` variable or exposed to the browser.

## Backend

All data access goes through Hasura GraphQL. The Anthropic API key is server-side only — all Claude calls happen in Route Handlers, never in Client Components.

**Local API:** `https://api.chatislam.local.nself.org:8543/v1/graphql`
**Production API:** `https://api.chatislam.org/v1/graphql`

## Contributing

See the [wiki](https://github.com/ummeco/chatislam/wiki) for architecture docs, theological guidelines, and contribution guidelines.

## License

[MIT](LICENSE)

---

*Last updated: 2026-04-28*
