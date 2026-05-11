# ChatIslam

Islamic AI: ask questions, get scholar-cited answers. Not a fatwa engine; a study companion.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/ummeco/chatislam/ci.yml?branch=main)](https://github.com/ummeco/chatislam/actions)
[![Version](https://img.shields.io/github/package-json/v/ummeco/chatislam?filename=web%2Fpackage.json)](https://github.com/ummeco/chatislam/releases)

**Live:** [chatislam.org](https://chatislam.org)

> IslamQA (islamqa.us) has merged into ChatIslam. All Q&A functionality is available here.

## Engineering Charter — Required Reading

Before contributing, read [`.github/wiki/ENGINEERING-CHARTER.md`](.github/wiki/ENGINEERING-CHARTER.md). It is the single source of truth for code standards across every Ummeco repo. The most-read sections:

- [§ 21 Common AI-Agent Mistakes](.github/wiki/ENGINEERING-CHARTER.md#21-common-ai-agent-mistakes-read-before-any-change)
- [§ 4 Naming Conventions](.github/wiki/ENGINEERING-CHARTER.md#4-naming-conventions-master-reference)
- [§ 6 Documentation Bar](.github/wiki/ENGINEERING-CHARTER.md#6-documentation-bar)

## What is this

ChatIslam is a free AI chat app for Islamic knowledge and dawah, built on Claude with strict Ahl us-Sunnah wal-Jama'ah guidelines. It adapts its tone to the audience (practicing Muslim, new Muslim, or non-Muslim) and cites sources from Quran, Hadith, and classical scholarship. It is not a fatwa service; complex fiqh questions are escalated to vetted human scholars.

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

## Quick Start

Start the shared Ummat backend first:

```bash
cd ~/Sites/ummeco/ummat/backend && nself start
```

**Web app:**

```bash
cd web
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY + Hasura/auth URLs
pnpm install
pnpm dev --port 3042   # https://www.chatislam.local.nself.org:8543 (port 8543)
```

`ANTHROPIC_API_KEY` is required for all Claude API routes. Never set it in any `NEXT_PUBLIC_*` variable or expose it to the browser.

## Backend

All data access goes through Hasura GraphQL. The Anthropic API key is server-side only — all Claude calls happen in Route Handlers, never in Client Components.

**Local API:** `https://api.chatislam.local.nself.org:8543/v1/graphql`
**Production API:** `https://api.chatislam.org/v1/graphql`

## Contribute

See [`.github/wiki/Contributing.md`](https://github.com/ummeco/chatislam/wiki/Contributing) for architecture docs, theological guidelines, and contribution guidelines.

## License

[MIT](LICENSE)
