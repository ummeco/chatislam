/**
 * lighthouserc.js — Lighthouse CI config for Astro 5
 * Target: all four categories >= 95 on static landing pages (QA-A gate).
 * REF: P2-E3-W02-S02-T02
 */

/** @type {import('@lhci/cli').LhciConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/dawah',
        'http://localhost:4321/donate',
        'http://localhost:4321/legal/sharia-disclaimer',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance':    ['error', { minScore: 0.95 }],
        'categories:accessibility':  ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo':            ['error', { minScore: 0.95 }],
        'first-contentful-paint':    ['warn',  { maxNumericValue: 1500 }],
        'largest-contentful-paint':  ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift':   ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time':       ['warn',  { maxNumericValue: 150 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
