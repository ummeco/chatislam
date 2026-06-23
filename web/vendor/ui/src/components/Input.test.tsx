/**
 * @ummat/ui — Input axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance + RTL classes per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Input } from './Input'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Input a11y', () => {
  it('has no axe violations on default render', async () => {
    const { container } = render(<Input aria-label="Search" />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with label', async () => {
    const { container } = render(<Input label="Email address" />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with error state', async () => {
    const { container } = render(<Input label="Email" error="Invalid email" />)
    await assertNoAxeViolations(container)
  })

  it('renders RTL classes on field row', () => {
    const { container } = render(<Input aria-label="Search" />)
    const fieldDiv = container.querySelector('.ummat-input__field')
    expect(fieldDiv?.className).toContain('ltr:flex-row')
    expect(fieldDiv?.className).toContain('rtl:flex-row-reverse')
  })

  it('renders RTL text-alignment on label', () => {
    const { container } = render(<Input label="Name" />)
    const label = container.querySelector('label')
    expect(label?.className).toContain('ltr:text-left')
    expect(label?.className).toContain('rtl:text-right')
  })
})
