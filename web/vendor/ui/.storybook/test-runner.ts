/**
 * @ummat/ui — Storybook test-runner config (T02-A)
 *
 * Purpose: axe accessibility assertions for CI — fail on critical+serious violations.
 *   Enforces ADR-005 gate (c) and ASI WCAG 2.1 AA cross-cutting requirement.
 * Inputs: Each rendered story, axe-playwright.
 * Outputs: Non-zero exit on any critical or serious axe violation.
 * Constraints: Tags match preview.tsx a11y config. Never relax to warnings.
 * SPORT: F-MASTER.md row "Storybook" ✅ P2
 */

import type { TestRunnerConfig } from '@storybook/test-runner'
import { checkA11y, configureAxe, injectAxe } from 'axe-playwright'

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page)
  },

  async postVisit(page) {
    await configureAxe(page, {
      rules: [],
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
    })

    // Fail on critical + serious violations only (per spec §3.1 + ADR-005 gate c)
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      // Only violations at impact: critical or serious cause test failure
      violationResultsOptions: {
        includedImpacts: ['critical', 'serious'],
      },
    })
  },
}

export default config
