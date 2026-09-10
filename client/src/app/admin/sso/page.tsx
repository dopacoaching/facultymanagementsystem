'use client'
import { useSsoBridge } from '@/lib/useSsoBridge'

// Admin SSO callback. identity-service only routes ADMIN-role AppLinks here
// (apps.ts adminSsoCallbackPath); requireAdmin makes the non-ADMIN branch
// defence-in-depth. Lands on /admin rather than a per-role home.
export default function AdminSsoBridgePage() {
  useSsoBridge({ loginPath: '/admin/login', requireAdmin: true, landingPath: '/admin' })
  return null
}
