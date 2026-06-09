import type { CSSProperties, ReactNode } from 'react'

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
        <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
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
      <div style={{ marginBottom: '1.25rem' }}>
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
  /** Optional retry callback — shows a Retry button */
  onRetry?: () => void
}

export function ErrorAlert({ message, what, onRetry }: ErrorAlertProps) {
  const heading = what ?? 'Something went wrong'

  const why = message
    ? message.charAt(0).toUpperCase() + message.slice(1)
    : 'An unexpected error occurred.'

  const fix = onRetry
    ? 'Click Retry to try again. If the problem persists, refresh the page or contact support.'
    : 'Try refreshing the page. If the problem persists, contact support.'

  return (
    <div className="alert alert-error" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="alert-icon">⚠</span>
        <strong>{heading}</strong>
      </div>
      <div style={{ paddingLeft: '1.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem' }}>
        <div><strong>Why:</strong> {why}</div>
        <div><strong>What to do:</strong> {fix}</div>
      </div>
      {onRetry && (
        <div style={{ paddingLeft: '1.625rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onRetry} style={{ marginTop: '0.25rem' }}>
            ↻ Retry
          </button>
        </div>
      )}
    </div>
  )
}

// ── Empty state with CTA ──────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ icon = '📭', title, description, action, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button
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
