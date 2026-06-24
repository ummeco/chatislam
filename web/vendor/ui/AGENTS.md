# AGENTS.md — @ummat/ui-pkg (transitional name for canonical @ummat/ui)

## Purpose
Canonical UI library at `packages/ui/`. Components, design tokens, Tailwind preset.

## Naming status (READ THIS FIRST)
The canonical workspace name **should be `@ummat/ui`**, but `apps/ui` already holds that name (on the legacy allowlist per PRI § Package Naming Convention). This package is published transitionally as `@ummat/ui-pkg` until `apps/ui` is renamed or removed in a future migration sprint.

**Migration steps (future ticket, NOT in STACK-PACKAGES T07 scope):**
1. Rename `apps/ui` → `apps/legacy-ui` (or delete if all consumers migrated)
2. Rename this package from `@ummat/ui-pkg` → `@ummat/ui`
3. Update `scripts/check-workspace-collisions.mjs` allowlist
4. Update every consumer import

## Hard rules
- `react` and `react-dom` are **peerDependencies**, not deps.
- Design tokens (`./tokens`) and the Tailwind preset (`./tailwind-preset`) are the canonical brand source — never hardcode `#C9F27A` or other brand hex values in app code.
- Component additions follow the existing shadcn/ui pattern in `src/components/`.

## File map
- `src/components/` — atomic + composite components
- `src/tokens/index.ts` — design tokens (colors, fonts)
- `tailwind-preset.ts` — Tailwind preset for app `tailwind.config.ts`
- `src/components.css` — base component styles
- `src/a11y.css` — accessibility utility styles

## Brand colors (canonical)
- `#C9F27A` lime (light)
- `#79C24C` green-mid
- `#1E5E2F` green-dark
- `#0D2F17` green-deep

## Tailwind preset usage
```ts
// app/tailwind.config.ts
import preset from '@ummat/ui-pkg/tailwind-preset';
export default { presets: [preset], content: ['./src/**/*.{ts,tsx}'] };
```

## When to touch
- Adding new components (follow existing shadcn pattern)
- Updating shared styles
- Tightening accessibility primitives

## When NOT to touch
- Brand hex values (delegate to `@ummat/brand`)
- App-specific layouts (those live in each app)
