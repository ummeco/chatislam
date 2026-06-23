/**
 * @ummat/ui — ErrorBoundary
 *
 * Purpose: React class error boundary that catches unhandled render errors
 *   and renders the provided fallback UI instead of crashing the tree.
 *   Wraps every route-level component per the robustness spec (§4.1).
 *
 * Inputs:
 *   - fallback: ReactNode — displayed when a render error is caught
 *   - onError?: (error: Error, info: ErrorInfo) => void — optional callback
 *     for Sentry capture (only INTERNAL errors go to Sentry; see spec §4.1)
 *   - children: ReactNode — the guarded subtree
 *
 * Outputs: children in the normal case; fallback when an error is caught.
 *
 * Constraints:
 *   - MUST NOT expose raw stack traces in the fallback UI
 *   - Used at route level: <ErrorBoundary fallback={<ErrorState onRetry={refetch} />}>
 *
 * SPORT: P2-E2-W02-S02-T01 — ErrorBoundary baseline component
 *
 * Ref: .claude/docs/p2-robustness-framework-spec.md §4.1
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryProps {
  /** Fallback UI to render when a render error is caught. */
  fallback: ReactNode
  /**
   * Optional callback for error reporting (e.g. Sentry.captureException).
   * Called with the error and React component stack.
   * MUST NOT expose the stack trace in the rendered UI.
   */
  onError?: (error: Error, info: ErrorInfo) => void
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  static displayName = 'ErrorBoundary'

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default ErrorBoundary
