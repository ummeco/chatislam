/**
 * @ummat/ui — Modal axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance + RTL classes per P2-E2-W02-S02-T01.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { Modal } from './Modal'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

describe('Modal a11y', () => {
  it('has no axe violations when open with title', async () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Confirm action">
        <p>Are you sure?</p>
      </Modal>,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations when closed', async () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="My Modal">
        <p>Content</p>
      </Modal>,
    )
    await assertNoAxeViolations(container)
  })

  it('renders RTL classes on modal header', () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Dialog">
        <p>Content</p>
      </Modal>,
    )
    const header = container.querySelector('.ummat-modal__header')
    expect(header?.className).toContain('ltr:flex-row')
    expect(header?.className).toContain('rtl:flex-row-reverse')
  })

  it('renders RTL text-alignment on title', () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Dialog Title">
        <p>Content</p>
      </Modal>,
    )
    const title = container.querySelector('.ummat-modal__title')
    expect(title?.className).toContain('ltr:text-left')
    expect(title?.className).toContain('rtl:text-right')
  })
})
