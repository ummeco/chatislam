# ADR-002 — SUPERSEDED: ChatIslam Next.js Override

**Status:** SUPERSEDED by D-P2-STACK-CANON (2026-06-14)
**Original status:** Accepted (2025-xx-xx)
**Superseded by:** D-P2-STACK-CANON via ticket P2-E3-W02-S02-T02

---

## Original Decision

ADR-002 established a standing exception for `chatislam/web`: keep Next.js 15 rather than
migrating to the Ummat canonical stack (Astro + Vite). The rationale at the time was:
- chatislam.org is predominantly interactive (AI chat), making SSR server components attractive.
- The Next.js App Router provided a unified server/client model for streaming AI responses.
- Migration risk was considered high relative to benefit.

## Superseding Decision: D-P2-STACK-CANON

The Phase 2 stack canonicalisation decision (D-P2-STACK-CANON, 2026-06-14) superseded all
standing Next.js exceptions across the Ummeco platform, including ADR-002. The reasoning:

1. **Astro islands pattern is superior for chatislam.org's actual use case.**
   The homepage, legal pages, dawah pages, and donate page are all static content.
   Only the `/chat` route is interactive. Astro's `client:load` island pattern is
   architecturally cleaner: zero JS on static pages, minimal hydration on `/chat`.

2. **SEO and Lighthouse 95+ are easier to achieve with static Astro pages** than with
   Next.js RSC which adds complexity without benefit for static content.

3. **Theology gate belongs in the CF Worker proxy**, not in Next.js route handlers.
   The CF Worker (infra repo) handles rate-limiting, Turnstile verification, and
   Anthropic API proxying — this separation of concerns is stack-neutral.

4. **React 19 islands via `@astrojs/react`** provide the same interactivity model
   with better performance characteristics for a mostly-static site with one interactive
   surface.

5. **D-P2-STACK-CANON 105-agent adversarial research study** (basis:
   `~/Sites/ummeco/.claude/docs/research/stack-decision-2026-06-14.md`) confirmed
   Astro 5 + islands as the canonical content-first app stack across the platform.

## Migration Outcome

- `chatislam/web` migrated from Next.js 15 to Astro 5 + TS + Tailwind in P2-E3-W02-S02-T02.
- AI chat island implemented as React 19 `client:load` Astro island.
- Cloudflare Turnstile integrated (D-P3-20 — hCaptcha removed).
- Sentry replaces GlitchTip references (D-P2-SENTRY-SOT).
- `@ummat/astro-preset` integration wires brand tokens, RTL, urql SSR.
- 301 redirects applied for all previously indexed Next.js routes.

## References

- D-P2-STACK-CANON (2026-06-14) — canonical stack decision
- D-P3-20 — Cloudflare Turnstile canonical CAPTCHA
- D-P2-SENTRY-SOT — Sentry is sole error tracking SoT
- Ticket P2-E3-W02-S02-T02 — implementation
- `~/Sites/ummeco/.claude/docs/research/stack-decision-2026-06-14.md` — research basis
