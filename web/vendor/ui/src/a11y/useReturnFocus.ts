/**
 * @ummat/ui — useReturnFocus
 *
 * Captures the active element when `active` flips true and restores focus to
 * it when `active` flips false (or on unmount). Use for non-modal surfaces
 * that need to behave like a modal for focus-restoration purposes (drawers,
 * popovers, command palettes).
 *
 * If you need a full focus trap, use <FocusTrap />. If you only need return-
 * focus, use this hook.
 *
 * Usage:
 *   const triggerRef = useRef<HTMLButtonElement>(null);
 *   useReturnFocus(open, triggerRef);
 */

import { useEffect, useRef } from 'react'

export function useReturnFocus(
  active: boolean,
  /**
   * Optional explicit trigger ref. If provided, focus restores to this element.
   * If omitted, focus restores to whatever was active when `active` became true.
   */
  triggerRef?: React.RefObject<HTMLElement | null>,
): void {
  const capturedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    capturedRef.current =
      (triggerRef?.current as HTMLElement | null) ??
      (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null)

    return () => {
      const target = capturedRef.current
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        // Defer one frame so the deactivating element isn't still focused at restore time.
        requestAnimationFrame(() => target.focus())
      }
    }
  }, [active, triggerRef])
}

export default useReturnFocus
