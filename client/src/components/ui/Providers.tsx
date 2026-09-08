'use client'
import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/store'
import { restoreSession } from '@/lib/sessionRestore'
import { ToastProvider } from '@/components/ui/Toast'
import PWAInstall from '@/components/ui/PWAInstall'

/**
 * On mount: if Redux has a persisted role (user was previously logged in) but
 * accessToken is null (stripped from localStorage by the persist transform),
 * attempt a silent refresh using the httpOnly refreshToken cookie.
 *
 * The actual work lives in `restoreSession`, which shares one in-flight request
 * with <Shell> so a cold load of an authenticated route fires a single
 * POST /api/auth/refresh instead of two racing ones.
 */
function SilentRefresh() {
  useEffect(() => { void restoreSession() }, [])
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SilentRefresh />
        <ToastProvider>
          {children}
          <PWAInstall />
        </ToastProvider>
      </PersistGate>
    </Provider>
  )
}
