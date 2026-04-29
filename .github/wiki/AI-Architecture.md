# AI Architecture

ChatIslam uses Anthropic's Claude (Sonnet 4.x) as its AI backbone. All Claude API calls run server-side in Next.js Route Handlers. The Anthropic API key is never exposed to the browser.

## Current setup (P3)

| Layer | Implementation |
| --- | --- |
| AI model | Anthropic Claude Sonnet 4.x |
| API integration | Direct Anthropic API (`anthropic` npm package) |
| Route | `POST /api/chat` (Next.js Route Handler, server-only) |
| Context source | Islam.wiki knowledge base (direct integration) |
| Session storage | Hasura GraphQL (`ci_sessions`, `ci_messages`) |

## Planned (Phase A6)

The Anthropic direct integration will migrate to the **nself-ai plugin** in Phase A6. This adds:
- Multi-model routing across Claude versions
- Shared prompt caching across Ummat apps
- Centralized spend tracking and alerting
- Automatic fallback on API errors

## System prompt structure

The system prompt assembles at request time from three layers:

1. **Core identity** -- who ChatIslam is, what sources it uses, what it will not do
2. **Audience mode** -- behavior rules specific to the selected mode (Muslim / New Muslim / Dawah)
3. **Madhab context** -- if the user has set a madhab preference, fiqh answers prefer that school

The system prompt is not exposed to users. It is validated before each request to prevent injection.

## Knowledge grounding

ChatIslam accesses the Islam.wiki database for:
- Exact Hadith text and grading (avoids hallucinated Hadith)
- Quran ayah text (avoids mis-quotation)
- Scholar positions on common fiqh questions

For questions where Islam.wiki has direct data, that data is injected into the context. For open questions, Claude reasons from its training knowledge within the system prompt constraints.

## Escalation

When Claude determines a question requires a scholar's direct answer (complex fiqh, individual circumstances, sensitive personal situations), it declines to answer directly and offers to escalate. Escalation routes the question to a volunteer scholar queue via Hasura.

Escalation triggers:
- Questions about specific fatwa rulings in unusual circumstances
- Questions where madhab positions significantly diverge and the answer has major consequences
- Questions where user indicates a personal situation requiring individual guidance

## BYO Keys

Users can provide their own Anthropic API key to bypass rate limits and use their own quota. See [[BYO-Keys]].

## See Also

- [[Audience-Modes]] -- how mode affects the system prompt
- [[Madhab-Handling]] -- madhab preference integration
- [[Rate-Limiting]] -- token budgets and spend alerts
- [[BYO-Keys]] -- per-user API keys
- [[Disclaimer]] -- what the AI can and cannot answer
