/**
 * eslint.config.mjs — ChatIslam Astro 5 ESLint config
 * Replaces eslint-config-next (removed — D-P2-STACK-CANON).
 * REF: P2-E3-W02-S02-T02
 */

import astroPlugin from 'eslint-plugin-astro'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import noBrandLightOnLight from './eslint-rules/no-brand-light-on-light.js'

const eslintConfig = [
  ...astroPlugin.configs.recommended,
  {
    ignores: [
      'public/**',
      'coverage/**',
      'k6/**',
      // Vendored sub-packages (file: deps) are consumed via their built dist/ and run
      // their own lint pipelines. We do not re-lint their internals here, with ONE
      // exception kept on purpose: vendor/consent/src stays linted so the brand-contrast
      // guard (no-brand-light-on-light) keeps covering CookieBanner.
      'vendor/api-conventions/**',
      'vendor/astro-preset/**',
      'vendor/brand/**',
      'vendor/errors/**',
      'vendor/ui/**',
      'vendor/consent/dist/**',
      'dist/**',
      '.astro/**',
      'node_modules/**',
    ],
  },
  // TypeScript-parsed files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // No Next.js imports (migration guard)
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'next',            message: 'Next.js is removed — use Astro or React 19.' },
          { name: 'next/navigation', message: 'Next.js is removed — use Astro routing.' },
          { name: 'next/link',       message: 'Next.js is removed — use <a> or Astro <a>.' },
          { name: 'next/image',      message: 'Next.js is removed — use <img> with Astro asset pipeline.' },
          { name: 'next-intl',       message: 'next-intl is removed — use @ummat/i18n.' },
        ],
        patterns: [
          { group: ['next/*'], message: 'Next.js is removed (D-P2-STACK-CANON).' },
        ],
      }],
      // No GlitchTip references
      'no-restricted-syntax': ['error', {
        selector: "Literal[value=/glitchtip|GLITCHTIP/i]",
        message: 'GlitchTip is removed — use Sentry (D-P2-SENTRY-SOT).',
      }],
      // No hCaptcha references
      // 'no-restricted-globals': already covered by no-restricted-imports
    },
  },
  // Astro files with same guards
  {
    files: ['**/*.astro'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'next',            message: 'Next.js is removed — use Astro or React 19.' },
          { name: 'next/navigation', message: 'Next.js is removed — use Astro routing.' },
          { name: 'next/link',       message: 'Next.js is removed — use <a> or Astro <a>.' },
          { name: 'next/image',      message: 'Next.js is removed — use <img> with Astro asset pipeline.' },
          { name: 'next-intl',       message: 'next-intl is removed — use @ummat/i18n.' },
        ],
        patterns: [
          { group: ['next/*'], message: 'Next.js is removed (D-P2-STACK-CANON).' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: "Literal[value=/glitchtip|GLITCHTIP/i]",
        message: 'GlitchTip is removed — use Sentry (D-P2-SENTRY-SOT).',
      }],
    },
  },
  // C-09a-FIX-01: brand contrast guard (TS/TSX only — Astro parser handles .astro)
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { ummat: { rules: { 'no-brand-light-on-light': noBrandLightOnLight } } },
    rules: {
      'ummat/no-brand-light-on-light': 'error',
    },
  },
]

export default eslintConfig
