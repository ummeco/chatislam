/**
 * @ummat/ui — tsup build config
 *
 * Outputs: ESM + CJS + TypeScript declarations.
 * Peer deps (react, react-dom, tailwindcss) are always external.
 *
 * Per ADR-005: tailwindcss <4; react >=18 (supports 18.x Vite + 19.x Next.js).
 * Per P2-E2-W02-S02-T01: dist/ must contain esm + cjs + dts for acceptance gate.
 */
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'tailwindcss',
    '@ummat/brand',
    // React Native — AsyncScreen.native.tsx is a separate entry; excluded from web bundle
    'react-native',
    '@react-native-community/netinfo',
    '@ummat/native-bridge',
  ],
  // Exclude *.native.tsx from web bundle (RN suffix handled by metro/expo bundler)
  esbuildOptions(options) {
    options.conditions = ['import', 'module']
  },
})
