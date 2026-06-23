/**
 * @ummat/ui — Toast / Notification
 *
 * WCAG: role="status" (non-urgent) or role="alert" (urgent).
 * Uses aria-live="polite" for status, aria-live="assertive" for errors.
 */

import React, { ReactNode, useEffect } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastProps {
  variant?: ToastVariant
  message: ReactNode
  /** Auto-dismiss timeout in ms. 0 = no auto-dismiss. */
  duration?: number
  onClose?: () => void
  className?: string
}

const icons: Record<ToastVariant, string> = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  error:   '❌',
}

export function Toast({
  variant = 'info',
  message,
  duration = 5000,
  onClose,
  className = '',
}: ToastProps) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const isError = variant === 'error' || variant === 'warning'

  return (
    <div
      className={['ummat-toast', `ummat-toast--${variant}`, className].filter(Boolean).join(' ')}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="ummat-toast__icon" aria-hidden="true">
        {icons[variant]}
      </span>
      <span className="ummat-toast__message">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="ummat-toast__close"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export default Toast
