'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'
import { login } from '@/services/auth.service'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})

type Form = z.infer<typeof schema>

export default function AdminLoginPage() {
  const dispatch  = useAppDispatch()
  const router    = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'
  const { accessToken, role } = useAppSelector((s) => s.auth)

  // Already authenticated as ADMIN — go straight to dashboard
  useEffect(() => {
    if (accessToken && role === 'ADMIN') {
      router.replace('/admin')
    }
  }, [accessToken, role, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    try {
      const res = await login(data.username, data.password)

      // This page is exclusively for the ADMIN role
      if (res.role !== 'ADMIN') {
        // Clear any stored token so the non-admin session is not persisted
        dispatch(clearCredentials())
        setError('password', { message: 'Invalid credentials' })
        return
      }

      dispatch(setCredentials({
        accessToken: res.accessToken,
        role:        res.role,
        userId:      res.userId,
        facultyId:   res.facultyId  ?? null,
        batchId:     res.batchId    ?? null,
        batchType:   res.batchType  ?? null,
      }))
      router.push('/admin')
    } catch (e: unknown) {
      setError('password', { message: e instanceof Error ? e.message : 'Login failed' })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Minimal header — no branding that reveals this is admin */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 6px 20px rgba(30,27,75,.3)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
          </div>
          <h1 style={{
            fontSize: '1.25rem', fontWeight: 800,
            color: 'var(--color-text)', margin: '0 0 0.25rem',
          }}>
            Management Portal
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: 0 }}>
            Restricted access — authorised personnel only
          </p>
        </div>

        {/* Session-expired banner */}
        {sessionExpired && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⏱</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>Session timed out</div>
              <div style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '0.1rem' }}>
                Signed out after 30 minutes of inactivity. Please sign in again.
              </div>
            </div>
          </div>
        )}

        {/* Login card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label className="label">Username</label>
              <input
                {...register('username')}
                className="input"
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
              />
              {errors.username && <p className="error-text">⚠ {errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="Enter password"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="error-text" style={{ marginTop: '0.375rem', fontSize: '0.8125rem' }}>
                  ⚠ {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
              style={{ marginTop: '0.25rem', width: '100%' }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: '0.9rem', height: '0.9rem', borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                  Verifying…
                </>
              ) : 'Sign In →'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
