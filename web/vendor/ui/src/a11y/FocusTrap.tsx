/**
 * @ummat/ui — FocusTrap
 *
 * Canonical focus-trap wrapper (T-P7-Q-A11Y-02).
 *
 * Implementation note: hand-rolled (zero-dep) — does not depend on focus-trap-react
 * or Radix. The Modal primitive uses native <dialog>.showModal() which provides its
 * own modal focus trap; FocusTrap exists for non-dialog surfaces (drawers, popovers,
 * inline trapped regions) and for legacy ad-hoc modal logic being migrated.
 *
 * WCAG 2.2 AA:
 * - 2.4.3 Focus Order — Tab and Shift+Tab cycle within the trap.
 * - 2.4.11 Focus Not Obscured — caller is responsible for visual placement.
 * - 2.1.2 No Keyboard Trap — Escape closes the trap (caller wires onEscape).
 *
 * Usage:
 *   <FocusTrap active={open} onEscape={onClose} returnFocusTo={triggerRef}>
 *     <Drawer>...</Drawer>
 *   </FocusTrap>
 */

import React, { ReactNode, useEffect, useRef } from 'react'

export interface FocusTrapProps {
  /** When false, the trap is inert and renders children unchanged. */
  active: boolean
  /** Wrapped content. */
  children: ReactNode
  /** Optional className for the wrapper element. */
  className?: string
  /** Called on Escape keydown while trap is active. */
  onEscape?: () => void
  /**
   * Element to restore focus to on deactivate. If omitted, focus restores to
   * whatever was active when the trap activated.
   */
  returnFocusTo?: React.RefObject<HTMLElement | null>
  /**
   * Selector for the initial focus target inside the trap. If omitted, the
   * first tabbable descendant is focused.
   */
  initialFocusSelector?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getTabbable(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false
    if (el.getAttribute('aria-hidden') === 'true') return false
    // Skip elements that are not in the layout (display:none, visibility:hidden).
    return el.offsetParent !== null || el === document.activeElement
  })
}

export function FocusTrap({
  active,
  children,
  className,
  onEscape,
  returnFocusTo,
  initialFocusSelector,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Capture the element to restore on deactivate.
  useEffect(() => {
    if (!active) return
    previouslyFocusedRef.current =
      (returnFocusTo?.current as HTMLElement | null) ??
      (document.activeElement as HTMLElement | null) ??
      null

    const container = containerRef.current
    if (!container) return

    // Move focus into the trap.
    const initial = initialFocusSelector
      ? container.querySelector<HTMLElement>(initialFocusSelector)
      : null
    const target = initial ?? getTabbable(container)[0] ?? container
    // tabIndex=-1 makes container programmatically focusable when no tabbable child exists.
    if (target === container && !container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1')
    }
    // Defer to next frame so portals / dialogs that mount-then-focus race resolves correctly.
    const raf = requestAnimationFrame(() => target.focus())

    return () => {
      cancelAnimationFrame(raf)
      // Restore focus on deactivate.
      const toFocus = previouslyFocusedRef.current
      if (toFocus && typeof toFocus.focus === 'function') {
        toFocus.focus()
      }
    }
  }, [active, initialFocusSelector, returnFocusTo])

  // Trap Tab + Shift+Tab and forward Escape.
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.stopPropagation()
        onEscape()
        return
      }
      if (event.key !== 'Tab') return
      const tabbable = getTabbable(container)
      if (tabbable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = tabbable[0]
      const last = tabbable[tabbable.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault()
          last?.focus()
        }
      } else {
        if (activeEl === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])

  return (
    <div ref={containerRef} className={className} data-ummat-focus-trap={active ? 'on' : 'off'}>
      {children}
    </div>
  )
}

export default FocusTrap
