'use client'
import { useId, type ReactNode, type RefObject } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Visible heading. Also used as the accessible name unless `labelledById` is set. */
  title: ReactNode
  /** id of an existing heading element to use as aria-labelledby. */
  labelledById?: string
  size?: 'sm' | 'md' | 'lg'
  /** Footer actions (buttons). Rendered in `.modal-footer`. */
  footer?: ReactNode
  children: ReactNode
  /** Element to focus first when the modal opens. */
  initialFocus?: RefObject<HTMLElement | null>
  /**
   * Close when the backdrop is clicked. Default false — most dialogs in this
   * app hold form input that an accidental outside click should not discard.
   * Escape and the close button always work.
   */
  dismissOnBackdrop?: boolean
}

/**
 * Accessible modal dialog.
 *  - role="dialog" + aria-modal, labelled by its heading
 *  - focus moves in on open, is trapped, and returns to the trigger on close
 *  - Escape and backdrop click close it; background scroll is locked
 *  - the backdrop covers the viewport so content behind cannot be clicked
 */
export function Modal({
  open, onClose, title, labelledById, size = 'sm', footer, children, initialFocus,
  dismissOnBackdrop = false,
}: ModalProps) {
  const generatedId = useId()
  const headingId = labelledById ?? generatedId
  const trapRef = useFocusTrap<HTMLDivElement>({ active: open, onEscape: onClose, initialFocus })

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { if (dismissOnBackdrop && e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`modal-panel${size === 'md' ? ' modal-md' : size === 'lg' ? ' modal-lg' : ''}`}
      >
        <div className="modal-header">
          {typeof title === 'string'
            ? <h2 id={labelledById ? undefined : headingId}>{title}</h2>
            : title}
          <button type="button" onClick={onClose} aria-label="Close dialog" className="modal-close">×</button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
