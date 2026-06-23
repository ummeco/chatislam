/**
 * @ummat/ui — DataState axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { DataState } from './DataState'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('DataState a11y', () => {
  it('has no axe violations in loading state', async () => {
    const { container } = render(
      <DataState state="loading"><p>Content</p></DataState>,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in empty state', async () => {
    const { container } = render(
      <DataState state="empty"><p>Content</p></DataState>,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in error state', async () => {
    const { container } = render(
      <DataState state="error"><p>Content</p></DataState>,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in success state', async () => {
    const { container } = render(
      <DataState state="success"><p>Content</p></DataState>,
    )
    await assertNoAxeViolations(container)
  })
})
