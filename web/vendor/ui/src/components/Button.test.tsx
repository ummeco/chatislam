/**
 * @ummat/ui — Button axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance on default render per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Button } from './Button'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Button a11y', () => {
  it('has no axe violations on default render', async () => {
    const { container } = render(<Button>Click me</Button>)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations when loading', async () => {
    const { container } = render(<Button loading>Loading</Button>)
    await assertNoAxeViolations(container)
  })

  it('renders RTL classes in label span', () => {
    const { container } = render(<Button>Text</Button>)
    const span = container.querySelector('span:not([aria-hidden])')
    expect(span?.className).toContain('ltr:flex-row')
    expect(span?.className).toContain('rtl:flex-row-reverse')
  })
})
