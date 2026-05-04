# ChatIslam — Web App

AI-powered Islamic Q&A and dawah assistant at [chatislam.org](https://chatislam.org). Fatwa-referenced answers, Tutor mode, Feynman method learning, and dawah tools.

## P4 Features Shipped

- ChatIslam beta + AI Modes (Tutor · Feynman · Dawah — CB-03/CB-04/CB-05)
- Conversation history persistence with session continuity (CB-07)
- Stream interruption recovery (CB-08)
- Citation deep-link URL schema (P4-C07) — `islam.wiki/{corpus}/{collection}/...`
- Spend guard (server-side Claude API cost cap)
- Seasonal mode theming (Ramadan, Eid, Dhul Hijjah)
- nSentry observability wiring (GlitchTip DSN + OTel instrumentation)

## Tech Stack

Next.js 15 · TypeScript · Tailwind CSS · Anthropic Claude API · Hasura GraphQL

## Dev

```bash
pnpm install
pnpm dev --port 3042
```

Local URL: `https://www.chatislam.local.nself.org:8543`

## Environment Variables

```env
# Server-only
REMOTE_SCHEMA_SECRET=
HASURA_GRAPHQL_ADMIN_SECRET=
HASURA_ADMIN_URL=https://api.ummat.dev/v1/graphql
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
AI_PROVIDER=anthropic_direct
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_SERVICE_NAME=chatislam-web

# Client + server
NEXT_PUBLIC_HASURA_URL=https://api.chatislam.local.nself.org:8543/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.local.nself.org:8543
NEXT_PUBLIC_BASE_URL=https://www.chatislam.local.nself.org:8543
NEXT_PUBLIC_FF_CONVERSATION_HISTORY=true

# Feature flags
FF_DAWAH_MODE=true
FF_SEASONAL_MODE=true
FF_CONVERSATION_HISTORY=true
```

See `.env.example` for full list including Tutor mode thresholds and seasonal override.

## AI Safety

ChatIslam is not a mufti. Answers are AI-generated from Islamic sources. Users are reminded that rulings require qualified scholars. The fatwa disclaimer is rendered on every response.

## Production

Vercel project: `ummat-chatislam` · Domain: `chatislam.org`
