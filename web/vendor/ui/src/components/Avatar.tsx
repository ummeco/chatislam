/**
 * @ummat/ui — Avatar
 *
 * User/entity avatar with image fallback to initials.
 * WCAG: alt text required when not decorative.
 */

import React, { ImgHTMLAttributes, useState } from 'react'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  /** Display name used to generate initials on fallback */
  name?: string
  size?: AvatarSize
  /** aria-label for the avatar (defaults to name) */
  label?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? ''
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}

export function Avatar({
  src,
  name = '',
  size = 'md',
  label,
  className = '',
  ...props
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError
  const initials = name ? getInitials(name) : '?'
  const ariaLabel = label ?? name ?? 'Avatar'

  return (
    <span
      className={['ummat-avatar', `ummat-avatar--${size}`, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={ariaLabel}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          aria-hidden="true"
          onError={() => setImgError(true)}
          className="ummat-avatar__img"
          {...props}
        />
      ) : (
        <span className="ummat-avatar__initials" aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  )
}

export default Avatar
