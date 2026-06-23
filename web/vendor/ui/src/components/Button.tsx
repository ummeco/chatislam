/**
 * @ummat/ui — Button
 *
 * WCAG 2.2 AA compliant:
 * - 2.5.8 Target Size: min 44×44px on mobile (via min-h + min-w + padding)
 * - 2.4.7 Focus Visible: :focus-visible ring via CSS class
 * - 4.1.2 Name, Role, Value: aria-label / aria-disabled supported
 * - Uses green-600 (#5A9438) on light-bg variant per D-P3-15
 *
 * RTL: ltr:flex-row rtl:flex-row-reverse applied to button inner layout.
 *   Icon-left buttons flip icon to the right in RTL locales automatically.
 *
 * No Tailwind dependency — use CSS custom properties from @ummat/brand/css.
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light-bg'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:    'ummat-btn--primary',
  secondary:  'ummat-btn--secondary',
  ghost:      'ummat-btn--ghost',
  danger:     'ummat-btn--danger',
  /** D-P3-15: use green-600 for light backgrounds — meets WCAG AA contrast */
  'light-bg': 'ummat-btn--light-bg',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'ummat-btn--sm',
  md: 'ummat-btn--md',
  lg: 'ummat-btn--lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={[
          'ummat-btn',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'ummat-btn--full' : '',
          loading ? 'ummat-btn--loading' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <span className="ummat-btn__spinner" aria-hidden="true" />
        ) : null}
        {/* ltr:flex-row rtl:flex-row-reverse — icon order mirrors reading direction */}
        <span className={[
          loading ? 'ummat-btn__label--hidden' : '',
          'ltr:flex-row rtl:flex-row-reverse',
        ].filter(Boolean).join(' ')}>{children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
