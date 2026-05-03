# nself-ai SDK — Expected Interface (Track A6 Integration Spec)

**Status:** Pending nSelf release. PCI filed 2026-04-27.  
**Decision:** D-P3-44 — ChatIslam stays on direct Anthropic API in P3. Migrate to nself-ai when SDK ships.  
**PCI:** `~/Sites/nself/.claude/inbox/msg-2026-04-27-nself-ai-sdk-integration.md`  
**Provider stub:** `chatislam/web/lib/ai-provider.ts` — `NselfAIProvider` class

---

## Summary

ChatIslam currently calls Anthropic Claude directly via `@anthropic-ai/sdk`. When nSelf ships
`nself-ai`, the migration swaps `AnthropicDirectProvider` for `NselfAIProvider` with zero
changes to call sites. The factory in `lib/ai-provider.ts` selects provider via `AI_PROVIDER`
env var.

---

## Expected nself-ai SDK API (contract for Track A6)

The stub in `NselfAIProvider` will be replaced with calls matching this interface.

### Install

```bash
pnpm add @nself/ai   # package name TBD — confirm with nSelf on release
```

### Client instantiation

```typescript
import { NselfAI } from '@nself/ai'

const client = new NselfAI({
  // nSelf plugin API key (from nSelf vault/secrets — NOT a raw Anthropic key)
  apiKey:    process.env.NSELF_AI_API_KEY,
  // Optional: base URL override for local dev (defaults to nSelf gateway)
  baseURL:   process.env.NSELF_AI_BASE_URL,
  // Optional: model pool priority list
  modelPool: (process.env.NSELF_AI_MODEL_POOL ?? 'local,anthropic').split(','),
})
```

### Chat call

```typescript
const result = await client.chat({
  model:     'claude-sonnet-4-6',   // or 'auto' to let nself-ai select
  maxTokens: 2048,
  system:    systemPrompt,
  messages:  [{ role: 'user', content: userText }],
})

// result shape (mirrors AnthropicDirectProvider.AIChatResult)
// {
//   content:      string        — assistant reply text
//   inputTokens:  number
//   outputTokens: number
//   cacheHit:     boolean       — true if answered from nSelf local LLM pool
//   modelId:      string        — model that actually answered
// }
```

### Rate limiting config

nself-ai is expected to accept plugin-layer config (replacing app-layer `REDIS_URL` rate limits):

```env
# Track A6: replace REDIS-based app-layer limits with nself-ai plugin config
NSELF_AI_RATE_LIMIT_REQUESTS_PER_MIN=20
NSELF_AI_RATE_LIMIT_TOKENS_PER_DAY=50000
NSELF_AI_RATE_LIMIT_BYO_KEY_BYPASS=true   # BYO-key users bypass pool limits
```

If nself-ai exposes rate-limit config differently, update `NselfAIProvider` to pass through
whatever config shape the plugin requires.

### Prompt injection defense config

Current defense lives at `lib/sanitize-input.ts` + `lib/aqeedah-guard.ts`. Track A6 ticket
A6-05 evaluates whether nself-ai plugin layer can absorb this. Expected config:

```env
NSELF_AI_PROMPT_INJECTION_BLOCK=true
NSELF_AI_CONTENT_FILTER_PRESET=islamic_strict
```

If nself-ai does not expose content filtering, keep app-layer guards and skip A6-05.

---

## Migration Checklist (Track A6 execution)

When nSelf publishes the SDK:

1. [ ] A6-01: Review release notes for breaking changes vs this spec
2. [ ] A6-02: `nself plugin install nself-ai` on ummat-prod; configure LLM pool
3. [ ] A6-03: Replace `NselfAIProvider.chat()` stub with real SDK call (this file is the spec)
4. [ ] A6-04: Move rate-limit config to plugin layer; remove `REDIS_URL` app-layer limit if plugin covers it
5. [ ] A6-05: Evaluate prompt-injection defense handoff (keep app-layer if plugin insufficient)
6. [ ] A6-06: Remove `ANTHROPIC_API_KEY` from chatislam env if fully replaced by `NSELF_AI_API_KEY`
7. [ ] A6-07: Full smoke test — Q&A flow, rate-limit headers, prompt-injection block
8. [ ] A6-08: 24h monitoring — latency, error rate, token cost vs direct-API baseline

---

## Env Vars Delta (A6 migration)

| Var | P3 (current) | Post-A6 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Required | Remove if fully replaced |
| `AI_PROVIDER` | `anthropic_direct` | `nself_ai` |
| `NSELF_AI_API_KEY` | Not needed | Required |
| `NSELF_AI_BASE_URL` | Not needed | Optional (local dev override) |
| `NSELF_AI_MODEL_POOL` | Not needed | Optional (`local,anthropic`) |
| `REDIS_URL` | Required (rate limit) | Likely optional if nself-ai covers it |

---

## BYO Key compatibility

`lib/byo-key.ts` validates and stores user-supplied Anthropic API keys. Post-A6, BYO-key users
either:
- Pass their key through nself-ai as a passthrough (preferred — nself-ai handles routing)
- Keep `AnthropicDirectProvider` as a named BYO-key-specific provider

Decision deferred to A6-03 implementation. `AIChatOptions.apiKey` exists on the interface for
this reason.

---

## Fallback behavior (graceful degradation)

`NselfAIProvider` currently throws `Error('not implemented')`. After migration, if nself-ai is
unavailable (plugin not installed, network issue), the factory should fall back:

```typescript
// In NselfAIProvider.chat():
try {
  return await nselfClient.chat(...)
} catch (err) {
  if (process.env.NSELF_AI_FALLBACK_TO_DIRECT === 'true') {
    console.warn('[ai-provider] nself-ai unavailable; falling back to anthropic_direct')
    return await fallbackProvider.chat(messages, opts)
  }
  throw err
}
```

Add `NSELF_AI_FALLBACK_TO_DIRECT=false` to `.env.example` when A6-03 ships.
