'use client'
import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface Options {
  /** When false the trap is inert (nothing focused, no key handling). */
  active: boolean
  /** Called when the user presses Escape inside the trap. */
  onEscape?: () => void
  /** Focus this element first instead of the first focusable descendant. */
  initialFocus?: React.RefObject<HTMLElement | null>
}

/**
 * Focus management for modal dialogs and drawers:
 *  - moves focus into the container on open (initialFocus, else first control,
 *    else the container itself)
 *  - keeps Tab / Shift+Tab cycling within the container
 *  - restores focus to the previously-focused element on close
 *  - routes Escape to `onEscape`
 *  - locks background scroll while active
 *
 * Returns a ref to spread onto the dialog container element.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  active, onEscape, initialFocus,
}: Options) {
  const containerRef = useRef<T | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    if (!containerRef.current) return
    const container: T = containerRef.current

    restoreRef.current = (document.activeElement as HTMLElement) ?? null

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)

    // Initial focus
    const first = initialFocus?.current ?? focusables()[0] ?? container
    // container needs a tabindex to be focusable as a last resort
    if (first === container && !container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1')
    }
    first.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onEscape?.(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement
      if (e.shiftKey && (activeEl === firstEl || !container.contains(activeEl))) {
        e.preventDefault(); lastEl.focus()
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault(); firstEl.focus()
      }
    }

    // If focus somehow escapes (e.g. user clicks outside), pull it back.
    function onFocusIn(e: FocusEvent) {
      if (!container.contains(e.target as Node)) {
        e.stopPropagation()
        ;(focusables()[0] ?? container).focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.body.style.overflow = prevOverflow
      restoreRef.current?.focus?.()
    }
  }, [active, onEscape, initialFocus])

  return containerRef
}
