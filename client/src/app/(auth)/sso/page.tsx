'use client'
import { useSsoBridge } from '@/lib/useSsoBridge'

// Staff SSO callback. ADMIN is intentionally excluded — admins only ever use
// /admin/login (and /admin/sso) in this app. See lib/useSsoBridge.ts for why
// this is a page rather than a bare redirect target.
export default function SsoBridgePage() {
  useSsoBridge({ loginPath: '/login', requireAdmin: false })
  return null
}
