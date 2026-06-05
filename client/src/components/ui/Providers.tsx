'use client'
import { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor, type RootState, type AppDispatch } from '@/store'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

/**
 * On mount: if Redux has a persisted role (user was previously logged in) but
 * accessToken is null (stripped from localStorage by the persist transform),
 * attempt a silent refresh using the httpOnly refreshToken cookie.
 * This restores the session without requiring the user to log in again.
 */
function SilentRefresh() {
  const dispatch = useDispatch<AppDispatch>()
  const { role, accessToken } = useSelector((s: RootState) => (s as { auth: { role: string | null; accessToken: string | null } }).auth)

  useEffect(() => {
    if (role && !accessToken) {
      fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        .then(async (res) => {
          if (!res.ok) { dispatch(clearCredentials()); return }
          const { accessToken: newToken } = await res.json() as { accessToken: string }
          const s = store.getState() as { auth: { userId: string | null; facultyId: string | null; batchId: string | null; batchType: string | null } }
          dispatch(setCredentials({
            accessToken: newToken,
            role:        role ?? '',
            userId:      s.auth.userId     ?? '',
            facultyId:   s.auth.facultyId  ?? null,
            batchId:     s.auth.batchId    ?? null,
            batchType:   s.auth.batchType  ?? null,
          }))
        })
        .catch(() => dispatch(clearCredentials()))
    }
  // Only run once on mount — role and accessToken from first render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SilentRefresh />
        {children}
      </PersistGate>
    </Provider>
  )
}
