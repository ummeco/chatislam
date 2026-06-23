/**
 * @ummat/ui — Playwright viewport matrix (B7-08)
 *
 * Shared viewport configurations for cross-app responsive CI.
 * Usage: import { viewportProjects } from '@ummat/ui/src/playwright-viewport-matrix'
 *        in your app's playwright.config.ts
 */

import { devices } from '@playwright/test'

/** Standard breakpoints — matches @ummat/brand --bp-* tokens */
export const viewports = {
  /** xs — 320px: smallest Android (Galaxy Fold closed) */
  xs: { width: 320, height: 568 },
  /** sm — 375px: iPhone SE / common small phone */
  mobile: { width: 375, height: 667 },
  /** md — 768px: iPad portrait / large phone landscape */
  tablet: { width: 768, height: 1024 },
  /** lg — 1280px: laptop / wide desktop */
  desktop: { width: 1280, height: 800 },
  /** xl — 1440px: wide desktop */
  wideDesktop: { width: 1440, height: 900 },
} as const

/**
 * Viewport matrix projects for Playwright.
 * The 3 required viewports per sprint gate (B7-08):
 * 375×667, 768×1024, 1280×800
 */
export const viewportProjects = [
  {
    name: 'mobile-375',
    use: {
      ...devices['iPhone SE'],
      viewport: { width: 375, height: 667 },
    },
  },
  {
    name: 'tablet-768',
    use: {
      viewport: { width: 768, height: 1024 },
      userAgent: devices['iPad'].userAgent,
      isMobile: false,
    },
  },
  {
    name: 'desktop-1280',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 800 },
    },
  },
] as const

/**
 * Extended matrix — full range including 320px and 1440px.
 */
export const extendedViewportProjects = [
  {
    name: 'xs-320',
    use: {
      viewport: { width: 320, height: 568 },
      isMobile: true,
    },
  },
  ...viewportProjects,
  {
    name: 'wide-1440',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1440, height: 900 },
    },
  },
] as const
