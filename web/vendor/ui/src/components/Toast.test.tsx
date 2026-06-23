/**
 * @ummat/ui — Toast axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Toast } from './Toast'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Toast a11y', () => {
  it('has no axe violations on default render', async () => {
    const { container } = render(
      <Toast message="Saved successfully" onClose={() => {}} />,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations on error variant', async () => {
    const { container } = render(
      <Toast message="Something went wrong" variant="error" onClose={() => {}} />,
    )
    await assertNoAxeViolations(container)
  })
})
