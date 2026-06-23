/**
 * @ummat/ui — Card
 *
 * Surface container with optional header/footer.
 */

import React, { HTMLAttributes, type JSX } from 'react'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Render as a button/link card (focusable) */
  interactive?: boolean
  asElement?: keyof JSX.IntrinsicElements
}

export function Card({
  variant = 'default',
  interactive = false,
  asElement: As = 'div',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    // @ts-expect-error polymorphic element
    <As
      className={[
        'ummat-card',
        `ummat-card--${variant}`,
        interactive ? 'ummat-card--interactive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {children}
    </As>
  )
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ummat-card__header', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ummat-card__body', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ummat-card__footer', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export default Card
