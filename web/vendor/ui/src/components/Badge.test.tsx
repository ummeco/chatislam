/**
 * @ummat/ui — Badge axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Badge } from './Badge'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Badge a11y', () => {
  it('has no axe violations on default render', async () => {
    const { container } = render(<Badge>New</Badge>)
    await assertNoAxeViolations(container)
  })

  it('renders with content', () => {
    const { getByText } = render(<Badge>5</Badge>)
    expect(getByText('5')).toBeTruthy()
  })
})
