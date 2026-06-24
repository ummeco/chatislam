/**
 * FILE:    chatislam/web/hooks/useAsyncScreen.ts
 * PURPOSE: Derives AsyncScreen 7-state props from fetch state + offline detection.
 *   All data-bearing client components in chatislam/web import this hook.
 *
 * Inputs:
 *   - loading: boolean — true while fetch in-flight
 *   - data: T | null | undefined — fetched data
 *   - error: Error | null
 *   - errorCode: string | undefined — 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_OFFLINE'
 *   - retryAfterMs: number | undefined — from Retry-After header
 *   - onRetry: () => void
 *   - isEmpty: (data: T) => boolean | undefined
 *
 * Outputs: AsyncScreenProps to spread onto <AsyncScreen {...props}>
 *
 * SPORT: P2-E5-W01-S01-T01 — robustness rollout (chatislam/web)
 * Ref: .claude/docs/p2-robustness-framework-spec.md §3.2
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import type { AsyncScreenProps } from '@ummat/ui'

interface UseAsyncScreenOptions<T> {
  loading: boolean
  data: T | null | undefined
  error: Error | null
  /** Canonical error code — 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_OFFLINE' | ... */
  errorCode?: string
  retryAfterMs?: number
  onRetry: () => void
  /** isEmpty: custom predicate — defaults to null/undefined check */
  isEmpty?: (data: T) => boolean
}

/**
 * useAsyncScreen — derives the 7-state AsyncScreen props.
 * Uses navigator.onLine + online/offline events for offline detection.
 */
export function useAsyncScreen<T>(
  opts: UseAsyncScreenOptions<T>
): AsyncScreenProps {
  const { loading, data, error, errorCode, retryAfterMs, onRetry, isEmpty } = opts

  const [offline, setOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const handleOnline  = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const stableOnRetry = useCallback(onRetry, [onRetry])

  const empty: boolean = !loading && !error && data == null
    ? true
    : !loading && !error && data != null && isEmpty != null
      ? isEmpty(data as T)
      : false

  return {
    loading,
    empty,
    error: errorCode === 'PERMISSION_DENIED' || errorCode === 'RATE_LIMITED'
      ? null  // those states have their own slots
      : error,
    offline: offline || errorCode === 'NETWORK_OFFLINE',
    permissionDenied: errorCode === 'PERMISSION_DENIED',
    rateLimited:      errorCode === 'RATE_LIMITED',
    retryAfterMs,
    onRetry: stableOnRetry,
  }
}

export default useAsyncScreen
