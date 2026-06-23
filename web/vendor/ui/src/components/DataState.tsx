/**
 * @ummat/ui — DataState (B5-01)
 *
 * 7-state wrapper component for all data-loading surfaces:
 *   loading | empty | error | offline | partial | success | stale
 *
 * Usage:
 *   <DataState state="loading" skeleton={<Skeleton lines={3} />}>
 *     <MyContent />
 *   </DataState>
 *
 * WCAG:
 * - aria-live="polite" for status updates
 * - role="alert" for errors
 * - role="status" for loading
 */

import React, { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

export type DataStateEnum =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'partial'
  | 'success'
  | 'stale'

export interface DataStateProps {
  state: DataStateEnum
  children: ReactNode
  /** Custom skeleton shown in loading state. Defaults to a 3-line text skeleton. */
  skeleton?: ReactNode
  /** Empty state content */
  emptyContent?: ReactNode
  /** Error state content */
  errorContent?: ReactNode
  /** Offline state content */
  offlineContent?: ReactNode
  /** Stale warning banner (shown above content in stale state) */
  staleBanner?: ReactNode
  /** Partial warning banner (shown above content in partial state) */
  partialBanner?: ReactNode
  className?: string
}

const defaultEmptyContent = (
  <div className="ummat-data-state ummat-data-state--empty" role="status" aria-live="polite">
    <span className="ummat-data-state__icon" aria-hidden="true">📭</span>
    <p className="ummat-data-state__message">No results yet.</p>
  </div>
)

const defaultErrorContent = (
  <div className="ummat-data-state ummat-data-state--error" role="alert">
    <span className="ummat-data-state__icon" aria-hidden="true">⚠️</span>
    <p className="ummat-data-state__message">Something went wrong. Please try again.</p>
  </div>
)

const defaultOfflineContent = (
  <div className="ummat-data-state ummat-data-state--offline" role="alert">
    <span className="ummat-data-state__icon" aria-hidden="true">📶</span>
    <p className="ummat-data-state__message">You appear to be offline.</p>
  </div>
)

export function DataState({
  state,
  children,
  skeleton,
  emptyContent,
  errorContent,
  offlineContent,
  staleBanner,
  partialBanner,
  className = '',
}: DataStateProps) {
  if (state === 'loading') {
    return (
      <div role="status" aria-label="Loading" aria-live="polite" className={className}>
        {skeleton ?? <Skeleton shape="text" lines={3} />}
      </div>
    )
  }

  if (state === 'empty') {
    return <>{emptyContent ?? defaultEmptyContent}</>
  }

  if (state === 'error') {
    return <>{errorContent ?? defaultErrorContent}</>
  }

  if (state === 'offline') {
    return <>{offlineContent ?? defaultOfflineContent}</>
  }

  // partial — show banner above content
  if (state === 'partial') {
    return (
      <div className={className}>
        {partialBanner ?? (
          <div className="ummat-data-state ummat-data-state--partial" role="status" aria-live="polite">
            <p className="ummat-data-state__message">Some data could not be loaded.</p>
          </div>
        )}
        {children}
      </div>
    )
  }

  // stale — show banner above content
  if (state === 'stale') {
    return (
      <div className={className}>
        {staleBanner ?? (
          <div className="ummat-data-state ummat-data-state--stale" role="status" aria-live="polite">
            <p className="ummat-data-state__message">Showing cached data. Refreshing…</p>
          </div>
        )}
        {children}
      </div>
    )
  }

  // success — just render children
  return <>{children}</>
}

export default DataState
