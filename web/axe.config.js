// axe-core accessibility config — Sprint B2 (B2-01 + WCAG 2.2 AA)
// Updated: 2026-04-27 — added WCAG 2.2 tags per D-P3-11
// Used by @axe-core/playwright in E2E tests.
// CI gate: CRITICAL + SERIOUS violations fail the build.

/** @type {import('@axe-core/playwright').AxeOptions} */
module.exports = {
  // D-P3-11: WCAG 2.2 AA — includes 2.4.11, 2.5.7, 2.5.8 new criteria
  runOnly: {
    type: 'tag',
    values: [
      'wcag2a', 'wcag2aa',
      'wcag21a', 'wcag21aa',
      'wcag22aa',   // WCAG 2.2 AA (axe-core 4.9+)
      'best-practice',
    ],
  },

  rules: {
    'color-contrast': { enabled: true },
    'focus-trap': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'target-size': { enabled: true },
  },

  exclude: [
    // Cloudflare Turnstile iframe (Turnstile is a3p frame, a11y tested by Cloudflare)
    ['iframe[src*="challenges.cloudflare.com"]'],
  ],
};
