import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.{ts,tsx}', '**/__tests__/**', '**/__mocks__/**', '**/*.d.ts'],
      // P7 Q-TEST T01 baseline thresholds (80/80/75/80, perFile: true).
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80, perFile: true },
      reportOnFailure: true,
    },
  },
})
