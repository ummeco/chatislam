/**
 * @ummat/ui — AsyncScreen axe-core + 7-state tests
 *
 * Verifies:
 *   1. Each of the 7 states renders its correct slot in isolation.
 *   2. children renders ONLY in the populated state.
 *   3. error state does NOT expose raw stack traces.
 *   4. No axe violations on default render.
 *
 * Per P2-E2-W02-S02-T01 and robustness spec §3.2.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { AsyncScreen, type AsyncScreenProps } from './AsyncScreen'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

const base: AsyncScreenProps = {
  loading: false,
  empty: false,
  error: null,
  offline: false,
  permissionDenied: false,
  rateLimited: false,
  onRetry: vi.fn(),
  children: <p data-testid="children">Data loaded</p>,
  emptySlot: <p data-testid="empty-slot">Nothing here yet</p>,
}

describe('AsyncScreen — 7 states', () => {
  it('loading state: renders loading slot, not children', () => {
    const { container, queryByTestId } = render(
      <AsyncScreen {...base} loading={true} />,
    )
    expect(container.querySelector('.ummat-async-screen--loading')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
    expect(queryByTestId('empty-slot')).toBeNull()
  })

  it('empty state: renders emptySlot, not children', () => {
    const { queryByTestId } = render(
      <AsyncScreen {...base} empty={true} />,
    )
    expect(queryByTestId('empty-slot')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
  })

  it('error state: renders error slot, not children, no stack trace', () => {
    const err = new Error('Intentional test error — stack trace must not appear in DOM')
    const { container, queryByTestId } = render(
      <AsyncScreen {...base} error={err} />,
    )
    expect(container.querySelector('.ummat-async-screen--error')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
    // Stack trace must NOT appear in the rendered output
    expect(container.innerHTML).not.toContain('at AsyncScreen')
    expect(container.innerHTML).not.toContain('Intentional test error — stack trace')
  })

  it('populated state: renders children only', () => {
    const { getByTestId, queryByTestId } = render(
      <AsyncScreen {...base} />,
    )
    expect(getByTestId('children')).toBeTruthy()
    expect(queryByTestId('empty-slot')).toBeNull()
  })

  it('offline state: renders offline slot, not children', () => {
    const { container, queryByTestId } = render(
      <AsyncScreen {...base} offline={true} />,
    )
    expect(container.querySelector('.ummat-async-screen--offline')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
  })

  it('permission-denied state: renders permission-denied slot, not children', () => {
    const { container, queryByTestId } = render(
      <AsyncScreen {...base} permissionDenied={true} />,
    )
    expect(container.querySelector('.ummat-async-screen--permission-denied')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
  })

  it('rate-limited state: renders rate-limited slot, not children', () => {
    const { container, queryByTestId } = render(
      <AsyncScreen {...base} rateLimited={true} retryAfterMs={5000} />,
    )
    expect(container.querySelector('.ummat-async-screen--rate-limited')).toBeTruthy()
    expect(queryByTestId('children')).toBeNull()
  })

  it('priority: offline > permissionDenied > rateLimited > loading > error > empty', () => {
    // All flags true — should show offline
    const { container } = render(
      <AsyncScreen
        {...base}
        offline={true}
        permissionDenied={true}
        rateLimited={true}
        loading={true}
        error={new Error('test')}
        empty={true}
      />,
    )
    expect(container.querySelector('.ummat-async-screen--offline')).toBeTruthy()
  })
})

describe('AsyncScreen a11y', () => {
  it('has no axe violations in populated state', async () => {
    const { container } = render(<AsyncScreen {...base} />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in loading state', async () => {
    const { container } = render(<AsyncScreen {...base} loading={true} />)
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in error state', async () => {
    const { container } = render(
      <AsyncScreen {...base} error={new Error('test')} />,
    )
    await assertNoAxeViolations(container)
  })
})
