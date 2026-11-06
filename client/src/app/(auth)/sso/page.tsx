'use client'
import Image from 'next/image'
import { useSsoBridge } from '@/lib/useSsoBridge'

// Staff SSO callback. ADMIN is intentionally excluded — admins only ever use
// /admin/login (and /admin/sso) in this app. See lib/useSsoBridge.ts for why
// this is a page rather than a bare redirect target.
export default function SsoBridgePage() {
  useSsoBridge({ loginPath: '/login', requireAdmin: false })
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
