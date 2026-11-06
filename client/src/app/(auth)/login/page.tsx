'use client'
import Image from 'next/image'
import PasswordInput from '@/components/ui/PasswordInput'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'
import { login, logout } from '@/services/auth.service'
import { roleHomePath } from '@/lib/roleHome'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})

type Form = z.infer<typeof schema>

// ADMIN is handled separately below (redirected away); every other role lands
// on its shared home — see lib/roleHome.ts.

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: Form) {
    try {
      const res = await login(data.username, data.password)

      // Admin accounts must use the management portal — do not reveal its existence.
      // Also clear the httpOnly refreshToken cookie the server just set, so the
      // admin's session doesn't linger on a shared / staff device.
      if (res.role === 'ADMIN') {
        try { await logout() } catch {}
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
      router.push(roleHomePath(res.role))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError('password', { message: msg })
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
            Every class, every campus, one clear record.
          </h2>
          <p style={{ marginTop: '1rem', fontSize: '1.0625rem', color: 'var(--color-on-navy-dim)' }}>
            Log sessions, follow faculty hours and keep academics on track, from the campus floor or the head office.
          </p>
        </div>
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--color-on-navy-dim)' }}>
          {['Entries and reports by campus, subject and faculty', 'Session tracking with a daily submission check', 'Syllabus and chapter progress'].map((t) => (
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

          <h1>Welcome back</h1>
          <p style={{ marginTop: '0.375rem', marginBottom: '1.75rem', color: 'var(--color-muted)' }}>Sign in to continue to the faculty management system.</p>

          {sessionExpired && (
            <div className="alert alert-warning" role="status" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Session timed out</div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  You were signed out after 30 minutes of inactivity. Please sign in again.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="form-stack" style={{ gap: '1.125rem' }} noValidate>
            <div className="form-group">
              <label className="label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                {...register('username')}
                className="input"
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                aria-invalid={errors.username ? true : undefined}
              />
              {errors.username && <p className="error-text">{errors.username.message}</p>}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="login-password">Password</label>
              <PasswordInput
                id="login-password"
                {...register('password')}
                showStrength={false}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && <p className="error-text" role="alert">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting} style={{ marginTop: '0.375rem' }}>
              {isSubmitting ? (<><span className="spinner spinner-on-solid" /> Signing in…</>) : 'Sign in'}
            </button>
          </form>

          <p className="help-text" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem' }}>
            Forgot your password? Contact HR to reset it.
          </p>
        </div>
      </main>
    </div>
  )
}
