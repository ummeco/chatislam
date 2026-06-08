# Getting Started

ChatIslam is currently in early development.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

## Setup

```bash
git clone https://github.com/ummeco/chatislam.git
cd chatislam/web
pnpm install
pnpm dev
```

## Project Status

ChatIslam is in the early scaffolding phase. The core AI integration, audience-adaptive modes, and Islam.wiki data pipeline are planned features. See [[Features]] for the full roadmap.

## Dev Environment

Requires: Ummat backend running (`cd ~/Sites/ummeco/ummat/backend && nself start`).

```bash
cd ~/Sites/ummeco/chatislam/web
pnpm dev --port 3042
```

Local dev runs at `https://www.chatislam.local.nself.org:8543` (port 8543, not 443 — ADR-0014).

### Env vars (`.env.local`)

| Variable | Where | Vault key |
|---|---|---|
| `NEXT_PUBLIC_HASURA_URL` | Local + Vercel | — (hardcoded per env) |
| `NEXT_PUBLIC_AUTH_URL` | Local + Vercel | — (hardcoded per env) |
| `REMOTE_SCHEMA_SECRET` | Vercel env | `CHATISLAM_REMOTE_SCHEMA_SECRET` |
| `ANTHROPIC_API_KEY` | Vercel env | `ANTHROPIC_API_KEY` (shared org key) |
| `HASURA_GRAPHQL_ADMIN_SECRET` | Local only (server-side) | `CHATISLAM_HASURA_ADMIN_SECRET` |

All secrets sourced from `~/.claude/vault.env`. Never hardcode; never commit `.env.local`.
