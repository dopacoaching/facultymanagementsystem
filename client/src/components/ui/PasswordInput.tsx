'use client'
import { useState, forwardRef, InputHTMLAttributes, useEffect } from 'react'
import { Icon } from './Icon'

// Eye glyphs are local: the shared icon set has no eye and it is lead-owned. Same stroke style as <Icon>.
function Eye({ off }: { off: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

// ── Strength scoring ──────────────────────────────────────────────────────────

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4   // 0 = empty/very weak … 4 = strong
  label: string
  color: string
  checks: {
    length: boolean
    upper: boolean
    lower: boolean
    digit: boolean
    special: boolean
  }
}

function scorePassword(pw: string): StrengthResult {
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    digit:   /[0-9]/.test(pw),
    special: /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw),
  }
  const passing = Object.values(checks).filter(Boolean).length

  if (!pw)        return { score: 0, label: '',        color: 'var(--color-border-strong)', checks }
  if (passing <= 1) return { score: 1, label: 'Weak',    color: 'var(--color-danger)', checks }
  if (passing === 2) return { score: 2, label: 'Fair',    color: 'var(--color-warning)', checks }
  if (passing === 3) return { score: 3, label: 'Good',    color: 'var(--color-info)', checks }
  return               { score: 4, label: 'Strong',  color: 'var(--color-success)', checks }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Show the strength bar + checklist below the input (default: true) */
  showStrength?: boolean
  /** Value controlled from outside (for strength scoring) */
  value?: string
}

/**
 * Drop-in replacement for `<input type="password">` that adds:
 *  - show/hide toggle
 *  - colour-coded strength bar
 *  - inline checklist of the five complexity rules
 *
 * Works with react-hook-form: spread the `register()` result onto it like any
 * normal `<input>`.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = true, value, onChange, className, style, ...rest }, ref) => {
    const [show, setShow] = useState(false)
    const [internalValue, setInternalValue] = useState((value as string) ?? '')

    // Keep internal value in sync when controlled externally
    useEffect(() => {
      if (value !== undefined) setInternalValue(value as string)
    }, [value])

    const strength = scorePassword(internalValue)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      setInternalValue(e.target.value)
      onChange?.(e)
    }

    const checklist = [
      { key: 'length',  label: '8+ chars' },
      { key: 'upper',   label: 'Uppercase' },
      { key: 'lower',   label: 'Lowercase' },
      { key: 'digit',   label: 'Number' },
      { key: 'special', label: 'Special char' },
    ] as const

    return (
      <div>
        {/* Input + show/hide button */}
        <div style={{ position: 'relative' }}>
          <input
            {...rest}
            ref={ref}
            type={show ? 'text' : 'password'}
            className={`input ${className ?? ''}`}
            style={{ paddingRight: '2.75rem', ...style }}
            {...(value !== undefined ? { value } : {})}
            onChange={handleChange}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <Eye off={show} />
          </button>
        </div>

        {/* Strength meter + checklist */}
        {showStrength && internalValue.length > 0 && (
          <div style={{ marginTop: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}>
              {([1, 2, 3, 4] as const).map((seg) => (
                <div
                  key={seg}
                  style={{
                    flex: 1, height: 4, borderRadius: 4,
                    background: strength.score >= seg ? strength.color : 'var(--color-surface-3)',
                    transition: 'background-color var(--dur-short) var(--ease-out)',
                  }}
                />
              ))}
              <span aria-live="polite" style={{ fontSize: 'var(--text-xs)', color: strength.color, fontWeight: 700, marginLeft: '0.5rem', minWidth: '2.5rem', textAlign: 'right' }}>
                {strength.label}
              </span>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.875rem' }}>
              {checklist.map(({ key, label }) => {
                const ok = strength.checks[key]
                return (
                  <li
                    key={key}
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: ok ? 'var(--color-success)' : 'var(--color-muted)',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}
                  >
                    {ok
                      ? <Icon name="check" size={12} />
                      : <span aria-hidden="true" style={{ width: 12, height: 12, display: 'grid', placeItems: 'center' }}><span className="dot" style={{ width: 4, height: 4 }} /></span>}
                    {label}
                    <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
export default PasswordInput
