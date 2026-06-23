/**
 * @ummat/ui — Skeleton
 *
 * Loading placeholder using the shared `ummat-skeleton-pulse` keyframe
 * defined in @ummat/brand/css. One keyframe, no per-component duplication (B6-06).
 *
 * WCAG: role="status" + aria-label so screen readers announce loading state.
 */

import React, { HTMLAttributes } from 'react'

export type SkeletonShape = 'rect' | 'circle' | 'text'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape
  width?: string | number
  height?: string | number
  /** Number of text-line skeletons to render */
  lines?: number
}

export function Skeleton({
  shape = 'rect',
  width,
  height,
  lines,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  if (shape === 'text' && lines && lines > 1) {
    return (
      <div role="status" aria-label="Loading" className="ummat-skeleton-group" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton ummat-skeleton--text"
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={[
        'skeleton',
        `ummat-skeleton--${shape}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        ...style,
      }}
      {...props}
    />
  )
}

export default Skeleton
