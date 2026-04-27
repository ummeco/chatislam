# TB9-05 Scaffold Notes

## What was scaffolded

This directory already had Next.js 15 + React 19 (ahead of the ticket's Next 14 spec) with
App Router routes for `/cookies`, `/donate`, `/privacy`, `/terms`, and `/api/graphql`.

The following files were added to complete the scaffold:

| File | Purpose |
|---|---|
| `tsconfig.json` | TypeScript config (Next 15 App Router default) |
| `app/layout.tsx` | Root layout — OG metadata, viewport, globals.css import |
| `app/page.tsx` | Placeholder home page |
| `app/globals.css` | Minimal CSS reset + Ummeco brand vars |
| `.gitignore` | Standard Next.js + pnpm + secrets exclusions |
| `public/legacy/index.html` | Original static HTML marketing page (moved from root) |

`package.json` was updated to add `lint` and `typecheck` scripts required by TB9-07/08 gates.

## Next steps

1. **Run `pnpm install`** in this directory to install any added/updated deps.
2. **Route migration:** the legacy static page at `public/legacy/index.html` is the current
   marketing page. A proper Next.js marketing page at `app/page.tsx` should replace the
   placeholder once design is ready. Until then, `public/legacy/index.html` is accessible
   at `/legacy/index.html` via Vercel static serving.
3. **Lighthouse + axe gates (TB9-07/TB9-08):** can now run against the Next.js dev server
   (`pnpm dev`) since a root `page.tsx` and `layout.tsx` exist.
4. **ESLint config:** `next lint` requires a `.eslintrc.json` or ESLint flat config. Add
   `eslint` + `eslint-config-next` devDependencies if not present, then run `pnpm lint`.
