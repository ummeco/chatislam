/**
 * FILE: packages/errors/tsup.config.ts
 * PURPOSE: Dual-build (ESM + CJS) entry config for @ummat/errors.
 * INVARIANTS:
 *   - Both ESM (.mjs) and CJS (.cjs) required: errors is consumed in Next.js
 *     route handlers (ESM) and backend action handlers (CJS).
 *   - @ummat/api-conventions is an external workspace dep — do not bundle.
 *   - Sourcemaps: inline in development, disabled in production.
 * DO NOT: bundle @ummat/api-conventions (circular bundle risk).
 * REF: T-BUILD-02 / T-BUILD-04 (sprint-Q-BUILD.md)
 */
import { defineConfig } from 'tsup'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'route-wrapper': 'src/route-wrapper.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: isDev ? 'inline' : false,
  clean: true,
  treeshake: true,
  splitting: false,
  external: [],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
})
