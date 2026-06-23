# @ummat/ui-pkg → @ummat/ui — Migration Notes

## Why this package is named `@ummat/ui-pkg`

Per the Package Naming Convention hard rule (PRI), every workspace package name MUST be
unique. STACK-PACKAGES T07 promotes the existing `apps/ui` library to `packages/ui` but
forbids deleting or modifying `apps/ui` until app consumers migrate. To avoid a name
collision during the transition, this package ships as `@ummat/ui-pkg` temporarily.

## Final name

After STACK-PACKAGES-RN-COMPAT + per-app migration tickets retire the `apps/ui` consumer
imports:

1. Delete `apps/ui/` entirely.
2. Remove `@ummat/ui` from `KNOWN_APPS_AT_UMMAT_NAMES` in `scripts/check-workspace-collisions.mjs`.
3. Rename `packages/ui/package.json` `name` field to `@ummat/ui`.
4. Codemod every workspace consumer: `@ummat/ui-pkg` → `@ummat/ui`.
5. Run `pnpm install` and `pnpm run check:workspace` to confirm zero collisions.

Tracked as: **STACK-PACKAGES T07 follow-up — package rename after consumer migration**.

## Why we did not modify `apps/ui` in this ticket

Spec T07 lists `ummat/apps/ui/` as OFF LIMITS. Any change there would require its own
ticket and pre-coordinated consumer-side updates.
