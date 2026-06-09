'use client'
import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void
  success:   (title: string, message?: string) => void
  error:     (title: string, message?: string) => void
  warning:   (title: string, message?: string) => void
  info:      (title: string, message?: string) => void
}

const ToastCtx = createContext<ToastContextValue | null>(null)

const DURATION: Record<ToastType, number> = {
  success: 3500,
  error:   6000,
  warning: 5000,
  info:    4000,
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'i',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }])
    setTimeout(() => dismiss(id), DURATION[type])
  }, [dismiss])

  const success = useCallback((t: string, m?: string) => showToast('success', t, m), [showToast])
  const error   = useCallback((t: string, m?: string) => showToast('error',   t, m), [showToast])
  const warning = useCallback((t: string, m?: string) => showToast('warning', t, m), [showToast])
  const info    = useCallback((t: string, m?: string) => showToast('info',    t, m), [showToast])

  return (
    <ToastCtx.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="region" aria-label="Notifications">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <span className="toast-icon">{ICONS[t.type]}</span>
              <div className="toast-body">
                <div className="toast-title">{t.title}</div>
                {t.message && <div className="toast-message">{t.message}</div>}
              </div>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
