/**
 * FILE:    chatislam/web/components/robustness/ErrorBoundary.tsx
 * PURPOSE: Route-level React ErrorBoundary re-export for chatislam/web.
 *   All route-level components wrap with <ErrorBoundary> per P2 AC-04.
 *
 * Constraints: React class component ('use client' required for App Router)
 * SPORT: P2-E5-W01-S01-T01 — robustness rollout (chatislam/web)
 * Ref: .claude/docs/p2-robustness-framework-spec.md §3
 */

export { ErrorBoundary, ErrorState } from '@ummat/errors/boundary'
export type { default } from '@ummat/errors/boundary'
