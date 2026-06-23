/**
 * @ummat/ui — vitest config
 *
 * Uses jsdom environment so axe-core + @testing-library/react work in unit tests.
 * Excludes *.native.tsx files (React Native — not testable in jsdom).
 * Excludes *.stories.tsx (Storybook — tested via test-storybook separately).
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/*.native.tsx',
      '**/*.stories.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: [
        '**/*.test.tsx',
        '**/*.test.ts',
        '**/*.stories.tsx',
        '**/*.native.tsx',
        'src/index.ts',
      ],
    },
  },
})
