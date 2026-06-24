# AGENTS.md — @ummat/api-conventions

## Purpose

Canonical response/error contract for every Ummat HTTP surface. Owns the `ok()` /
`fail()` helpers, the `request_id` middleware, and the zod-error → API-error mapper.

## Invariants

- Every API route returns either `{ data, request_id }` or `{ error: { code, message }, request_id }`.
- `error.code` values are a closed enum — never invent a new one without an ADR.
- `request_id` is propagated via `x-request-id` and logged at every layer.
- This package depends on NOTHING from other `@ummat/*` packages (it sits at the bottom of the graph).

## DO NOT

- Add framework-specific code here (no Next.js / Express imports). It must remain framework-neutral.
- Couple to logging or observability — those wrap this package, not the other way around.
- Change the `error.code` enum without coordinating with consumers (every web app + every backend service).

## Test commands

```bash
pnpm --filter @ummat/api-conventions test
pnpm --filter @ummat/api-conventions type-check
```

## Owners

Owned by the Ummat platform layer. Changes touch every consumer; require CR-B + CR-C
on schema changes.
