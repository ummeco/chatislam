# ChatIslam Web — API Reference

**Base path:** `/api` — Next.js App Router `route.ts` handlers.
**Auth:** Chat requires no account by default (anonymous usage allowed) but authenticated users get higher quotas. JWT is a Hasura Auth bearer token.

---

## Chat

### `POST /api/chat`

**Auth:** Anonymous (rate-limited 5 req/min IP) or User JWT (30 req/min). Plan tier extracted from JWT.
**Purpose:** Main AI chat endpoint — processes a theological question and returns a streaming or buffered response.

**Request body:**
```
{
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  madhab?: 'hanafi' | 'maliki' | 'shafii' | 'hanbali',
  audienceMode?: 'scholar' | 'student' | 'general',
  sessionId?: string,
  byoKey?: string   // BYO Anthropic key (SCI-19)
}
```

**Response:** `application/json` or `text/event-stream` (if streaming).
```
{ answer: string, citations?: string[], sessionId: string, tokensUsed: number }
```

**Security pipeline (in order):**
1. Middleware rate limit
2. Session + plan tier decode
3. Daily quota gate (402 on exhaustion)
4. Per-user/IP Redis rate limit (429)
5. Daily token budget check (429)
6. Input sanitization — strip escalation tokens
7. Injection detection + logging
8. Repeated-query abuse detection
9. Aqeedah guardrail check
10. BYO key priority
11. System prompt construction (madhab + audience + hardening)
12. AI provider call
13. Moderation + spend tracking
14. Persist messages

**Errors:**
| Code | Meaning |
|---|---|
| `400` | Invalid body or injection blocked |
| `402` | Daily quota exhausted (upgrade prompt) |
| `429` | Rate limited / token budget exceeded / repeated query |
| `503` | Platform-wide spend cap exceeded |
| `500` | Unexpected error |

---

## Widget

### `POST /api/widget/init`

**Auth:** Origin-validated (whitelist via `WIDGET_ALLOWED_ORIGINS` env var).
**Purpose:** Initialize an embedded ChatIslam widget session. Called by the widget on mount.
**Request body:** `{ mode: string, origin: string }`
**Response:** `{ sessionId: string, mode: string }`
**Errors:** `403` origin not on allowlist.

---

## Early Access

### `POST /api/early-access`

**Auth:** Public.
**Purpose:** Register an email for early access waitlist.
**Request body:** `{ email: string, source?: string }`
**Response:** `{ ok: true, alreadyRegistered?: boolean }`
**Errors:** `400` invalid email, `429` rate exceeded.

---

## GraphQL

### `POST /api/graphql`

**Auth:** User JWT (forwarded to Hasura). Anonymous reads allowed per role.
**Purpose:** Hasura GraphQL proxy for ChatIslam data (conversation history, user settings).
**Request:** Standard GraphQL `{ query, variables, operationName }`.
**Response:** Standard GraphQL response.

---

## Cron

### `POST /api/cron/spend-alert`

**Auth:** Cron secret header (`x-cron-secret`).
**Purpose:** Check daily/monthly AI spend against configured thresholds and send alert emails when limits are approached.
**Response:** `{ alertsSent: number, currentSpend: number }`
**Errors:** `401` invalid secret.
