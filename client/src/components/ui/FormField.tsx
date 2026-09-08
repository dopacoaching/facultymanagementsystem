'use client'
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

interface FormFieldProps {
  label: ReactNode
  /** Explicit id for the control. Auto-generated when omitted. */
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  /** Marks the label with a required indicator and sets aria-required on the control. */
  required?: boolean
  /** A single form control element. Its id / aria-* attributes are wired up automatically. */
  children: ReactNode
  /** Extra class on the wrapping `.form-group`. */
  className?: string
}

/**
 * Wraps one form control with a programmatically-associated label, optional hint
 * and error. The child control automatically receives:
 *   - `id` (from `htmlFor` or a generated one)
 *   - `aria-describedby` pointing at the hint and/or error
 *   - `aria-invalid="true"` when `error` is set
 *   - `aria-required="true"` when `required`
 *
 * This removes the app-wide pattern of bare `<label>` text with no `for`/`id`
 * link, which screen readers do not announce as a labelled field.
 */
export function FormField({
  label, htmlFor, hint, error, required, children, className,
}: FormFieldProps) {
  const generated = useId()
  const controlId = htmlFor ?? `ff-${generated}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  let control: ReactNode = children
  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>
    const existingDescribedBy = child.props['aria-describedby'] as string | undefined
    control = cloneElement(child, {
      id: child.props.id ?? controlId,
      'aria-describedby': [existingDescribedBy, describedBy].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? true : child.props['aria-invalid'],
      'aria-required': required ? true : child.props['aria-required'],
    })
  }

  return (
    <div className={`form-group${className ? ` ${className}` : ''}`}>
      <label className="label" htmlFor={controlId}>
        {label}
        {required && <span className="label-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {hint && <p className="help-text" id={hintId}>{hint}</p>}
      {error && (
        <p className="error-text" id={errorId} role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      )}
    </div>
  )
}
