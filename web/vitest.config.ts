import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    // Vendored sub-packages (file: deps) ship their own vitest suites and tsconfig
    // (which extend a monorepo base not present here). They are validated in their
    // own CI; this app only tests its own src/, lib/, and __tests__/.
    exclude: ['node_modules', 'dist', '**/__tests__/e2e/**', 'vendor/**'],
    testTimeout: 10000,
    coverage: {
      // P7 Q-TEST T01 baseline. Critical-path scope (T02 90%) — spend-guard +
      // aqeedah-guard — gets enforced via include-narrowed coverage:critical script
      // when those modules land.
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        perFile: true,
      },
      reportOnFailure: true,
      all: true,
    },
  },
})
