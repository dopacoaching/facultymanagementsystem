'use client'
import { Component, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

/**
 * Catches unhandled React render errors and shows a friendly recovery message
 * instead of a blank screen. Wrap around any complex subtree.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? 'Unknown error' }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error" role="alert" style={{ margin: '2rem auto', padding: '1.25rem 1.5rem', maxWidth: 560, gap: '0.875rem' }}>
          <Icon name="alert" size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Something went wrong on this page.</strong>
            <div className="mono" style={{ marginTop: '0.25rem', fontSize: 'var(--text-sm)', opacity: 0.85, overflowWrap: 'anywhere' }}>
              {this.state.message}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
