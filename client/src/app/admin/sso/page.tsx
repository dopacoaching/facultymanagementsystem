'use client'
import Image from 'next/image'
import { useSsoBridge } from '@/lib/useSsoBridge'

// Admin SSO callback. identity-service only routes ADMIN-role AppLinks here
// (apps.ts adminSsoCallbackPath); requireAdmin makes the non-ADMIN branch
// defence-in-depth. Lands on /admin rather than a per-role home.
export default function AdminSsoBridgePage() {
  useSsoBridge({ loginPath: '/admin/login', requireAdmin: true, landingPath: '/admin' })
  return (
    <main className="auth-shell" style={{ placeItems: 'center' }}>
      <div className="auth-card" style={{ textAlign: 'center' }} role="status" aria-live="polite">
        <span className="auth-logo" style={{ margin: '0 auto 1.5rem' }}>
          <Image src="/logo.png" alt="DOPA" width={30} height={30} style={{ objectFit: 'contain' }} priority />
        </span>
        <h1 style={{ fontSize: '1.375rem' }}>Signing you in</h1>
        <p style={{ marginTop: '0.375rem', color: 'var(--color-muted)' }}>Confirming your account with the identity portal.</p>
        <span className="spinner" style={{ width: '1.5rem', height: '1.5rem', marginTop: '1.5rem' }} />
      </div>
    </main>
  )
}
