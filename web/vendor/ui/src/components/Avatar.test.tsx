/**
 * @ummat/ui — Avatar axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Avatar } from './Avatar'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Avatar a11y', () => {
  it('has no axe violations with initials fallback', async () => {
    const { container } = render(<Avatar name="Ali Salaah" />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with decorative image', async () => {
    const { container } = render(
      <Avatar src="https://example.com/avatar.jpg" name="Ali Salaah" alt="Ali Salaah" />,
    )
    await assertNoAxeViolations(container)
  })
})
