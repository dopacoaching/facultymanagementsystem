'use client'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'
import { login } from '@/services/auth.service'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})

type Form = z.infer<typeof schema>

// ADMIN is intentionally excluded — admins use /admin/login
const _coordinatorToken = process.env.NEXT_PUBLIC_COORDINATOR_TOKEN ?? ''
const roleHome: Record<string, string> = {
  HR_MANAGER:           '/hr',
  ACADEMICS_MANAGER:    '/academics',
  IS_ACADEMICS_MANAGER: '/is',
  COORDINATOR:          `/c/${_coordinatorToken}`,
  IS_COORDINATOR:       '/is',       // legacy — kept for backward-compat
  FACULTY:              '/faculty',
}

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

      // Admin accounts must use the management portal — do not reveal its existence
      if (res.role === 'ADMIN') {
        dispatch(clearCredentials())
        setError('password', { message: 'Invalid credentials' })
        return
      }

      dispatch(setCredentials({
        accessToken: res.accessToken,
        role: res.role,
        userId: res.userId,
        facultyId: res.facultyId ?? null,
        batchId: res.batchId ?? null,
      }))
      router.push(roleHome[res.role] ?? '/faculty')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError('password', { message: msg })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--color-bg)',
    }}>
      {/* Left panel — brand */}
      <div style={{
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: '0 0 45%',
        background: 'linear-gradient(150deg, #312e81 0%, #4f46e5 55%, #6366f1 100%)',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="login-brand-panel"
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.06)',
          top: -100, right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.04)',
          bottom: -80, left: -80,
        }} />

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24,
            background: 'rgba(255,255,255,.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.75rem',
          }}>
            <Image
              src="/DOPA-Logo.png"
              alt="DOPA Coaching"
              width={70}
              height={70}
              style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
              priority
            />
          </div>
          <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            DOPA Coaching
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '1rem', margin: 0 }}>
            Faculty Management System
          </p>

          <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            {[
              { icon: '📊', label: 'Salary & Payroll', desc: 'Accurate, contract-driven calculations' },
              { icon: '📅', label: 'Session Tracking', desc: 'Real-time attendance & scheduling' },
              { icon: '🎓', label: 'Academics', desc: 'Chapters, exams, and exam topics' },
            ].map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '1.25rem',
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{f.icon}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>{f.label}</div>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.8125rem', marginTop: '0.1rem' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
        }}>
          {/* Mobile logo (hidden on wider screens via left panel) */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="login-mobile-logo">
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 24px rgba(79,70,229,.35)',
            }}>
              <Image
                src="/DOPA-Logo.png"
                alt="DOPA"
                width={50}
                height={50}
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.25rem' }}>
              Faculty Management
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
              DOPA Coaching — Sign in to continue
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
                  You were signed out after 30 minutes of inactivity. Please sign in again.
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            padding: '2.25rem 2rem',
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.75rem', color: 'var(--color-text)' }}>
              Sign in to your account
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                <label className="label">Username</label>
                <input
                  {...register('username')}
                  className="input"
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                  style={{ fontSize: '0.9375rem' }}
                />
                {errors.username && <p className="error-text">⚠ {errors.username.message}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  className="input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ fontSize: '0.9375rem' }}
                />
                {errors.password && (
                  <p className="error-text" style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                    ⚠ {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isSubmitting}
                style={{ marginTop: '0.375rem', width: '100%', gap: '0.5rem' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" style={{ width: '0.9rem', height: '0.9rem', borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                    Signing in…
                  </>
                ) : 'Sign In →'}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
          }}>
            Contact HR to reset your password
          </p>
        </div>
      </div>
    </div>
  )
}
