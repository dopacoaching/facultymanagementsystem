import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// ── Base skeleton block ───────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = '1rem', radius, style }: SkeletonProps) {
  return (
    <span
      className="skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  )
}

// ── Multiple text lines ───────────────────────────────────────────────────────

export function SkeletonText({ lines = 3, lastWidth = '60%' }: { lines?: number; lastWidth?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  )
}

// ── Table skeleton ────────────────────────────────────────────────────────────

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const widths = ['45%', '30%', '55%', '25%', '40%', '35%', '50%', '20%']
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height="0.75rem" width="60%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <Skeleton height="0.875rem" width={widths[(r * cols + c) % widths.length]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Card skeleton ─────────────────────────────────────────────────────────────

export function SkeletonCard({ lines = 4, showHeader = true }: { lines?: number; showHeader?: boolean }) {
  return (
    <div className="card">
      {showHeader && (
        <div className="card-header">
          <Skeleton height="1rem" width="40%" />
          <Skeleton height="1rem" width="15%" />
        </div>
      )}
      <SkeletonText lines={lines} />
    </div>
  )
}

// ── Stat cards skeleton ───────────────────────────────────────────────────────

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card" style={{ gap: '0.5rem' }}>
          <Skeleton height="0.75rem" width="60%" />
          <Skeleton height="1.75rem" width="40%" />
          <Skeleton height="0.7rem"  width="50%" />
        </div>
      ))}
    </div>
  )
}

// ── Page-level loading wrapper ────────────────────────────────────────────────

export function PageLoading({ type = 'table' }: { type?: 'table' | 'cards' | 'dashboard' }) {
  if (type === 'dashboard') {
    return (
      <div>
        <SkeletonStats count={4} />
        <div className="panel-grid-2" style={{ marginTop: '1.5rem' }}>
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      </div>
    )
  }
  if (type === 'cards') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>
    )
  }
  return (
    <div className="card">
      <div className="mb-4">
        <Skeleton height="2.25rem" width={220} radius="var(--radius)" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  )
}

// ── Structured error alert ────────────────────────────────────────────────────

interface ErrorAlertProps {
  message: string
  /** Short summary of what happened (auto-generated if omitted) */
  what?: string
  /**
   * Repeats the failed operation. Use ONLY when there is a real operation to
   * re-run (a failed fetch/submit) — never to merely hide the message.
   */
  onRetry?: () => void
  /**
   * Clears/acknowledges the message without re-running anything. Use for
   * submit failures the user must correct, or transient notices.
   */
  onDismiss?: () => void
}

export function ErrorAlert({ message, what, onRetry, onDismiss }: ErrorAlertProps) {
  const heading = what ?? 'Something went wrong'

  const why = message
    ? message.charAt(0).toUpperCase() + message.slice(1)
    : 'An unexpected error occurred.'

  const fix = onRetry
    ? 'Select Retry to run it again. If it keeps failing, refresh the page or contact support.'
    : 'Check the details above and try again. If the problem persists, contact support.'

  return (
    <div className="alert alert-error" role="alert" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
      <div className="cluster" style={{ gap: '0.5rem' }}>
        <Icon name="alert" size={18} />
        <strong>{heading}</strong>
      </div>
      <div style={{ paddingLeft: '1.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: 'var(--text-sm)' }}>
        <div><strong>Why:</strong> {why}</div>
        <div><strong>What to do:</strong> {fix}</div>
      </div>
      {(onRetry || onDismiss) && (
        <div className="cluster" style={{ paddingLeft: '1.625rem', marginTop: '0.25rem' }}>
          {onRetry && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Retry</button>
          )}
          {onDismiss && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state with CTA ──────────────────────────────────────────────────────

interface EmptyStateProps {
  /** @deprecated No longer rendered — EmptyState now shows a fixed neutral glyph.
   *  Accepted (and ignored) for backwards compatibility with older call sites. */
  icon?: string
  /** Optional glyph from the shared icon set (default: inbox). */
  iconName?: IconName
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ title, description, action, children, iconName = 'inbox' }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon name={iconName} size={24} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={action.onClick}
          style={{ marginTop: '1rem' }}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  )
}
