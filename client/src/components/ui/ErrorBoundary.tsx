'use client'
import { Component, type ReactNode } from 'react'

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
        <div className="alert alert-error" style={{ margin: '2rem', padding: '1.5rem' }}>
          <span className="alert-icon">🚨</span>
          <div>
            <strong>Something went wrong on this page.</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.85 }}>
              {this.state.message}
            </div>
            <button
              className="btn btn-ghost btn-sm"
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
