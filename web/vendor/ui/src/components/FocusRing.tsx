/**
 * @ummat/ui — FocusRing (B2-07)
 *
 * Utility wrapper that guarantees a visible :focus-visible ring.
 * Use on any custom interactive element that might suppress the browser
 * default (e.g. elements with outline: none from a CSS reset).
 *
 * WCAG 2.4.7 Focus Visible (AA) + 2.4.11 Focus Not Obscured (2.2 AA)
 */

import React, { ReactNode, HTMLAttributes } from 'react'

export interface FocusRingProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  /** Extra offset in px (default 2) */
  offset?: number
}

export function FocusRing({
  children,
  offset = 2,
  className = '',
  style,
  ...props
}: FocusRingProps) {
  return (
    <span
      className={['ummat-focus-ring', className].filter(Boolean).join(' ')}
      style={{ '--focus-ring-offset': `${offset}px`, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </span>
  )
}

export default FocusRing
