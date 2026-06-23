/**
 * @ummat/ui — Storybook 9.x preview config (T02-A)
 *
 * Purpose: Injects brand tokens, a11y config, RTL toolbar decorator into every story.
 *   Carries over all config from legacy preview.ts plus RTL toolbar decorator.
 * Inputs: @ummat/brand tokens, @ummat/ui CSS.
 * Outputs: Shared preview context for all @ummat/ui + (future) @ummat/design-system stories.
 * Constraints: No urql client, no TanStack Query, no data fetching (C1). Fixture props only.
 * SPORT: F-MASTER.md row "Storybook" ✅ P2
 */

import React from 'react'
import type { Preview, Decorator } from '@storybook/react'

// Brand tokens so CSS custom properties are available in every story
import '../../brand/src/tokens.css'
import '../src/components.css'
import '../src/a11y.css'

/**
 * RTL toolbar decorator — sets dir attribute on the story root element.
 * Required: i18n+RTL is an ASI cross-cutting requirement (see §5 spec).
 * Activated via Storybook toolbar (globals.direction).
 */
const withRTL: Decorator = (Story, context) => {
  const dir = (context.globals as { direction?: string }).direction ?? 'ltr'
  return (
    <div dir={dir} style={{ fontFamily: 'inherit' }}>
      <Story />
    </div>
  )
}

const preview: Preview = {
  globalTypes: {
    direction: {
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: {
        title: 'Direction',
        icon: 'paragraph',
        items: [
          { value: 'ltr', title: 'LTR', right: '⇒' },
          { value: 'rtl', title: 'RTL (Arabic/Urdu)', right: '⇐' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withRTL],
  parameters: {
    // a11y: fail on CRITICAL + SERIOUS violations (ADR-005 gate c, ASI WCAG 2.1 AA floor)
    a11y: {
      config: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
        },
      },
      options: {
        resultTypes: ['violations'],
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#07180d' },    // --color-bg
        { name: 'surface', value: '#0f2418' }, // --color-surface
        { name: 'light', value: '#f5faf2' },   // light mode bg
        { name: 'white', value: '#ffffff' },
      ],
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    // Deep link path format: /?path=/docs/ui-button--docs
    docs: {
      toc: true,
    },
  },
}

export default preview
