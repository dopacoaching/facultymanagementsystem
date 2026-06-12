'use client'
import { useState, forwardRef, InputHTMLAttributes, useEffect } from 'react'

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

  if (!pw)        return { score: 0, label: '',        color: '#e5e7eb', checks }
  if (passing <= 1) return { score: 1, label: 'Weak',    color: '#ef4444', checks }
  if (passing === 2) return { score: 2, label: 'Fair',    color: '#f59e0b', checks }
  if (passing === 3) return { score: 3, label: 'Good',    color: '#3b82f6', checks }
  return               { score: 4, label: 'Strong',  color: '#22c55e', checks }
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

    return (
      <div style={{ position: 'relative' }}>
        {/* Input + show/hide button */}
        <div style={{ position: 'relative' }}>
          <input
            {...rest}
            ref={ref}
            type={show ? 'text' : 'password'}
            className={`input ${className ?? ''}`}
            style={{ paddingRight: '2.75rem', ...style }}
            value={value ?? ''}
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            style={{
              position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', fontSize: '1rem', padding: '0.25rem',
              lineHeight: 1,
            }}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? '🙈' : '👁'}
          </button>
        </div>

        {/* Strength bar + checklist */}
        {showStrength && internalValue.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            {/* Bar */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '0.375rem' }}>
              {([1, 2, 3, 4] as const).map((seg) => (
                <div
                  key={seg}
                  style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: strength.score >= seg ? strength.color : '#e5e7eb',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
              <span style={{ fontSize: '0.7rem', color: strength.color, fontWeight: 700, marginLeft: '0.375rem', minWidth: 36 }}>
                {strength.label}
              </span>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.75rem' }}>
              {[
                { key: 'length',  label: '8+ chars' },
                { key: 'upper',   label: 'Uppercase' },
                { key: 'lower',   label: 'Lowercase' },
                { key: 'digit',   label: 'Number' },
                { key: 'special', label: 'Special char' },
              ].map(({ key, label }) => {
                const ok = strength.checks[key as keyof typeof strength.checks]
                return (
                  <span
                    key={key}
                    style={{
                      fontSize: '0.7rem',
                      color: ok ? '#16a34a' : 'var(--color-muted)',
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                    }}
                  >
                    {ok ? '✓' : '○'} {label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
export default PasswordInput
