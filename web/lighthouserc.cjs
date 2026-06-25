/**
 * lighthouserc.cjs — Lighthouse CI config for Astro 5 (SSR app)
 * Target: all four categories >= 95 on static landing pages (QA-A gate).
 *
 * The app is SSR (output: 'server', @astrojs/vercel adapter) so there is no
 * ./dist. The four landing pages below are `export const prerender = true`,
 * so `pnpm build` emits their static HTML into the Vercel static output dir.
 * LHCI serves that dir directly — no running server needed, fully deterministic.
 * REF: P2-E3-W02-S02-T02 · T-P7-Q-PERF-01
 */

/** @type {import('@lhci/cli').LhciConfig} */
module.exports = {
  ci: {
    collect: {
      // Vercel adapter writes prerendered HTML + client assets here.
      staticDistDir: './.vercel/output/static',
      url: [
        'http://localhost/',
        'http://localhost/dawah',
        'http://localhost/donate',
        'http://localhost/legal/sharia-disclaimer',
      ],
      numberOfRuns: 3,
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
