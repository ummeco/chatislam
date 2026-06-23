/**
 * @ummat/ui — Storybook 9.x config (T02-A fallback: design-system not yet scaffolded)
 *
 * Purpose: Single Storybook instance for all shared Ummat UI components.
 *   Globs stories from packages/ui/src/ (primary) and — once packages/design-system/
 *   is scaffolded — will move hosting there. This file is the ADR-005 gate (c)
 *   fallback per spec §1: "Storybook host falls back to packages/ui/".
 * Inputs: Storybook 9.x CLI, Vite 7.x builder (D-P2-VITE-RANGE C2).
 * Outputs: Local dev server :6006; storybook-static/ for Vercel ummat-storybook.
 * Constraints: Vite >=7 <9 (C2). No data fetching in stories (C1). React-vite framework only.
 * SPORT: F-MASTER.md row "Storybook" ✅ P2
 */

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  // T02-A: glob design-system src (empty until scaffolded) + all @ummat/ui stories
  stories: [
    '../src/**/*.stories.@(ts|tsx|mdx)',
    // Future: uncomment when packages/design-system/ is scaffolded (P2-E2-W02-S02-T01 dep)
    // '../../design-system/src/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',  // axe-core integration — fail critical+serious in CI
    '@storybook/addon-docs',
    {
      name: '@storybook/addon-viewport',
      options: {
        // Match @ummat/tailwind-preset breakpoints (mobile-first)
        viewports: {
          mobile: { name: 'Mobile 360', styles: { width: '360px', height: '740px' } },
          sm: { name: 'sm 640', styles: { width: '640px', height: '900px' } },
          md: { name: 'md 768', styles: { width: '768px', height: '1024px' } },
          lg: { name: 'lg 1024', styles: { width: '1024px', height: '768px' } },
          xl: { name: 'xl 1280', styles: { width: '1280px', height: '900px' } },
          '2xl': { name: '2xl 1536', styles: { width: '1536px', height: '900px' } },
        },
        defaultViewport: 'mobile',
      },
    },
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  // Vite 7.x config (D-P2-VITE-RANGE C2: >=7 <9)
  viteFinal: async (config) => {
    return config
  },
}

export default config
