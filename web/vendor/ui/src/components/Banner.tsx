/**
 * @ummat/ui — Banner
 *
 * Full-width informational or status banner.
 * WCAG: role="region" with aria-label, or role="alert" for errors.
 */

import React, { ReactNode } from 'react'

export type BannerVariant = 'info' | 'success' | 'warning' | 'error' | 'offline'

export interface BannerProps {
  variant?: BannerVariant
  children: ReactNode
  onDismiss?: () => void
  className?: string
  /** aria-label for the landmark region */
  label?: string
}

export function Banner({
  variant = 'info',
  children,
  onDismiss,
  className = '',
  label,
}: BannerProps) {
  const isAlert = variant === 'error' || variant === 'warning'

  return (
    <div
      className={['ummat-banner', `ummat-banner--${variant}`, className].filter(Boolean).join(' ')}
      role={isAlert ? 'alert' : 'region'}
      aria-label={label ?? `${variant} notification`}
      aria-live={isAlert ? 'assertive' : 'polite'}
    >
      <span className="ummat-banner__content">{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ummat-banner__dismiss"
          aria-label="Dismiss"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export default Banner
