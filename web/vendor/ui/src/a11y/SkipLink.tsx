/**
 * @ummat/ui — SkipLink
 *
 * Canonical skip-to-main link (T-P7-Q-A11Y-03).
 *
 * WCAG 2.2 AA:
 * - 2.4.1 Bypass Blocks — first focusable element on every page is a skip link
 *   that jumps to the page's main content.
 *
 * Mount as the FIRST child of <body> in every app's root layout. Pair with a
 * <main id="main" tabIndex={-1}> landmark so the activation lands cleanly.
 *
 * Styling: visually hidden until focused; on focus it pops into the top-start
 * corner with a strong contrast background. The styling uses Tailwind logical
 * utilities so the corner respects RTL (start-2 not left-2).
 *
 * Translation: pass the localized label via `children` or default to plain
 * 'Skip to main content' (English fallback). Apps SHOULD provide a translated
 * label via the `common.a11y.skipToMain` key.
 */

import React, { ReactNode } from 'react'

export interface SkipLinkProps {
  /** Anchor target. Default '#main'. */
  href?: string
  /** Localized label. Default 'Skip to main content'. */
  children?: ReactNode
  /** Optional className appended to the canonical class list. */
  className?: string
}

const DEFAULT_CLASSNAME =
  'ummat-skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:bg-white focus:text-[#0D2F17] focus:px-4 focus:py-2 focus:ring-2 focus:ring-[#1E5E2F] focus:rounded'

export function SkipLink({
  href = '#main',
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  const composed = className ? `${DEFAULT_CLASSNAME} ${className}` : DEFAULT_CLASSNAME
  return (
    <a href={href} className={composed} data-ummat-skip-link="">
      {children}
    </a>
  )
}

export default SkipLink
