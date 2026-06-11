'use client'
import { useEffect, useState, useCallback } from 'react'

/**
 * PWA bootstrap + mobile install button.
 *
 *  - Registers /sw.js (production only — caching during dev is a footgun).
 *  - Android/Chrome: captures `beforeinstallprompt` and shows a floating
 *    "Install app" pill that triggers the native install dialog.
 *  - iOS Safari: no install prompt API exists, so the same pill opens a short
 *    "Share → Add to Home Screen" instruction sheet.
 *  - Hidden when already running as an installed app (standalone) and for
 *    14 days after the user dismisses it. Desktop hides it via CSS (>900px).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'dopa-pwa-install-dismissed'
const DISMISS_DAYS = 14

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ reports as Mac — distinguish via touch support.
  return /iphone|ipad|ipod/i.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document)
}

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY))
    return Boolean(ts) && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showButton, setShowButton] = useState(false)
  const [iosMode, setIosMode] = useState(false)
  const [showIosSheet, setShowIosSheet] = useState(false)

  // Register the service worker once (production only).
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[PWA] Service worker registration failed:', err)
    })
  }, [])

  // Decide whether to offer installation.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    // iOS has no beforeinstallprompt — offer manual instructions instead.
    if (isIOS()) {
      setIosMode(true)
      setShowButton(true)
      return
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setShowButton(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (iosMode) { setShowIosSheet(true); return }
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowButton(false)
    if (outcome === 'dismissed') {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    }
  }, [deferredPrompt, iosMode])

  const handleDismiss = useCallback(() => {
    setShowButton(false)
    setShowIosSheet(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }, [])

  if (!showButton) return null

  return (
    <>
      <div className="pwa-install-bar" role="complementary" aria-label="Install app">
        <button className="pwa-install-btn" onClick={handleInstall}>
          <span aria-hidden="true">⬇</span> Install app
        </button>
        <button
          className="pwa-install-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >×</button>
      </div>

      {showIosSheet && (
        <div
          className="pwa-ios-backdrop"
          onClick={() => setShowIosSheet(false)}
          role="dialog" aria-modal="true" aria-label="Install on iPhone or iPad"
        >
          <div className="pwa-ios-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-handle" />
            <h3>Install DOPA FMS</h3>
            <p>Add this app to your home screen for quick, full-screen access:</p>
            <ol>
              <li>Tap the <strong>Share</strong> button <span aria-hidden="true">(⎙ in Safari&apos;s toolbar)</span></li>
              <li>Scroll and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top corner</li>
            </ol>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowIosSheet(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
