# AGENTS.md — @ummat/consent

## Purpose

GDPR + CCPA consent UI + hook for every Ummat web app. Single source of truth for
which cookie categories are opt-in vs strictly necessary.

## Invariants

- Default state is "consent NOT given" — analytics + marketing are off until the user
  explicitly accepts.
- Categories: `necessary` (always on), `analytics`, `marketing`, `preferences`.
- Persists choice in a first-party cookie scoped to the app domain. Never to a third-party.

## DO NOT

- Add a new category without an ADR — it ripples to every consent screen + every analytics
  init in every app.
- Pre-grant any category by default — that's a regulatory violation.
- Couple to a specific analytics vendor; this package is vendor-neutral. Umami integration
  lives in the consuming app.

## Test commands

```bash
pnpm --filter @ummat/consent test
pnpm --filter @ummat/consent type-check
```
