'use client'
import { useEffect } from 'react'
import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import PasswordInput from '@/components/ui/PasswordInput'
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
        campusName:  res.campusName ?? null,
        campusId:    res.campusId   ?? null,
      }))
      router.push('/admin')
    } catch (e: unknown) {
      setError('password', { message: e instanceof Error ? e.message : 'Login failed' })
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-hidden="true">
        <div className="flex items-center gap-3">
          <span className="auth-logo"><Image src="/logo.png" alt="" width={30} height={30} style={{ objectFit: 'contain' }} priority /></span>
          <span style={{ fontWeight: 650, letterSpacing: '-0.015em', fontSize: '1.0625rem' }}>DOPA Coaching</span>
        </div>
        <div style={{ maxWidth: 440 }}>
          <h2 style={{ fontSize: '2.5rem', lineHeight: 1.08, letterSpacing: '-0.035em', fontWeight: 650 }}>
            Oversight for every campus, in one place.
          </h2>
          <p style={{ marginTop: '1rem', fontSize: '1.0625rem', color: 'var(--color-on-navy-dim)' }}>
            Manage accounts, review the audit trail and keep faculty records accurate.
          </p>
        </div>
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--color-on-navy-dim)' }}>
          {['User accounts and roles', 'Append-only audit log of every action', 'Faculty, entries and reports'].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span style={{ width: 6, height: 6, borderRadius: 9, background: 'var(--color-brand-sky)', boxShadow: '0 0 10px var(--color-brand-sky)' }} />
              {t}
            </li>
          ))}
        </ul>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo flex items-center gap-3" style={{ marginBottom: '2rem' }}>
            <span className="auth-logo"><Image src="/logo.png" alt="DOPA" width={30} height={30} style={{ objectFit: 'contain' }} priority /></span>
            <span style={{ fontWeight: 650, letterSpacing: '-0.015em' }}>DOPA Faculty Management</span>
          </div>

          <h1>Management Portal</h1>
          <p style={{ marginTop: '0.375rem', marginBottom: '1.75rem', color: 'var(--color-muted)' }}>Restricted access: authorised personnel only</p>

          {sessionExpired && (
            <div className="alert alert-warning" role="status" style={{ marginBottom: '1.25rem' }}>
              <Icon name="clock" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600 }}>Session timed out</div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  Signed out after 30 minutes of inactivity. Please sign in again.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="form-stack" style={{ gap: '1.125rem' }} noValidate>
            <div className="form-group">
              <label className="label" htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                {...register('username')}
                className="input"
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
                aria-invalid={errors.username ? true : undefined}
              />
              {errors.username && <p className="error-text">{errors.username.message}</p>}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="admin-password">Password</label>
              <PasswordInput
                id="admin-password"
                {...register('password')}
                showStrength={false}
                placeholder="Enter password"
                autoComplete="current-password"
              />
              {errors.password && <p className="error-text" role="alert">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting} style={{ marginTop: '0.375rem' }}>
              {isSubmitting ? (<><span className="spinner spinner-on-solid" /> Verifying…</>) : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
