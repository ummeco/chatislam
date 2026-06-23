/**
 * @ummat/ui — Modal
 *
 * WCAG 2.2 AA:
 * - 2.4.11 Focus Not Obscured: focus trap inside modal; backdrop does not obscure focused element
 * - 2.5.8 Target Size: close button min 44×44px
 * - 4.1.2: role="dialog", aria-modal, aria-labelledby
 * - Focus returns to trigger on close
 *
 * RTL: ltr:text-left rtl:text-right on title;
 *   ltr:flex-row rtl:flex-row-reverse on modal header (title + close button swap sides).
 *
 * No external deps — uses native <dialog> element for accessibility.
 */

import React, {
  ReactNode,
  useEffect,
  useRef,
  HTMLAttributes,
  KeyboardEvent,
} from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** Element that triggered the modal — focus returns here on close */
  triggerRef?: React.RefObject<HTMLElement | null>
  children: ReactNode
  className?: string
  /** Max width of modal content area */
  maxWidth?: string
}

export function Modal({
  open,
  onClose,
  title,
  triggerRef,
  children,
  className = '',
  maxWidth = '32rem',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useRef(`ummat-modal-title-${Math.random().toString(36).slice(2)}`)

  // Open/close native dialog
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) {
        dialog.close()
        // Return focus to trigger
        triggerRef?.current?.focus()
      }
    }
  }, [open, triggerRef])

  // Handle Escape key via native dialog + explicit handler
  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Handle backdrop click
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={title ? titleId.current : undefined}
      className={['ummat-modal', className].filter(Boolean).join(' ')}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <div
        className="ummat-modal__content"
        style={{ maxWidth }}
        role="document"
      >
        {/* ltr:flex-row rtl:flex-row-reverse — close button and title swap in RTL */}
        <div className="ummat-modal__header ltr:flex-row rtl:flex-row-reverse">
          {/* ltr:text-left rtl:text-right — title aligns with reading direction */}
          {title ? (
            <h2 id={titleId.current} className="ummat-modal__title ltr:text-left rtl:text-right">
              {title}
            </h2>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="ummat-modal__close"
            aria-label="Close dialog"
          >
            {/* SVG X icon — inline for zero-dep */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="ummat-modal__body">{children}</div>
      </div>
    </dialog>
  )
}

export default Modal
