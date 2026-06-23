/**
 * @ummat/ui — ErrorBoundary axe-core accessibility tests
 *
 * Verifies WCAG 2.2 AA compliance on both normal and error states.
 * Also verifies that raw stack traces are NOT exposed in the fallback UI.
 *
 * Per P2-E2-W02-S02-T01 and robustness spec §4.1.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { ErrorBoundary } from './ErrorBoundary'

async function assertNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
  })
  expect(results.violations).toHaveLength(0)
}

/** Component that throws during render — used to trigger the boundary */
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Intentional render error')
  return <p>Normal content</p>
}

describe('ErrorBoundary a11y', () => {
  // Suppress React's console.error for expected error boundary events
  const originalConsoleError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalConsoleError
  })

  it('has no axe violations in normal state', async () => {
    const { container } = render(
      <ErrorBoundary fallback={<p>Error occurred</p>}>
        <p>Normal content</p>
      </ErrorBoundary>,
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations in error (fallback) state', async () => {
    const { container } = render(
      <ErrorBoundary fallback={<p role="alert">Something went wrong. Please try again.</p>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    await assertNoAxeViolations(container)
  })

  it('renders fallback instead of stack trace when an error is caught', () => {
    const { container, queryByText } = render(
      <ErrorBoundary fallback={<p>Error occurred</p>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    // Fallback renders
    expect(queryByText('Error occurred')).toBeTruthy()
    // Raw stack trace not exposed in DOM
    expect(container.innerHTML).not.toContain('Error:')
    expect(container.innerHTML).not.toContain('at Bomb')
  })

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary fallback={<p>Error</p>} onError={onError}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
  })
})
