/**
 * @ummat/ui — Input
 *
 * WCAG 2.2 AA compliant:
 * - 2.5.8 Target Size 24×24px minimum (enforced via min-height)
 * - 2.4.7 Focus Visible: :focus-visible ring
 * - 1.3.1 Info and Relationships: label association via htmlFor/id
 * - 4.1.2 Name, Role, Value: aria-invalid, aria-describedby
 *
 * RTL: ltr:text-left rtl:text-right on label + hint/error;
 *   ltr:flex-row rtl:flex-row-reverse on the adornment row.
 */

import React, { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  /** Left icon or adornment */
  prefixEl?: React.ReactNode
  /** Right icon or adornment */
  suffixEl?: React.ReactNode
  fullWidth?: boolean
}

let idCounter = 0
const nextId = () => `ummat-input-${++idCounter}`

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      prefixEl,
      suffixEl,
      fullWidth = false,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? nextId()
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div
        className={[
          'ummat-input-wrap',
          fullWidth ? 'ummat-input-wrap--full' : '',
          error ? 'ummat-input-wrap--error' : '',
          disabled ? 'ummat-input-wrap--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* ltr:text-left rtl:text-right — label aligns with reading direction */}
        {label ? (
          <label htmlFor={inputId} className="ummat-input__label ltr:text-left rtl:text-right">
            {label}
          </label>
        ) : null}

        {/* ltr:flex-row rtl:flex-row-reverse — prefix/suffix swap sides in RTL */}
        <div className="ummat-input__field ltr:flex-row rtl:flex-row-reverse">
          {prefixEl ? (
            <span className="ummat-input__prefix" aria-hidden="true">
              {prefixEl}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={['ummat-input', className].filter(Boolean).join(' ')}
            {...props}
          />

          {suffixEl ? (
            <span className="ummat-input__suffix" aria-hidden="true">
              {suffixEl}
            </span>
          ) : null}
        </div>

        {hint && !error ? (
          <p id={hintId} className="ummat-input__hint ltr:text-left rtl:text-right">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="ummat-input__error ltr:text-left rtl:text-right" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
