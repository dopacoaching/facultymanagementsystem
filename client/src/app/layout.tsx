import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from '@/components/ui/Providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })

export const viewport: Viewport = {
  themeColor: '#0b1226',
  width: 'device-width',
  initialScale: 1,
  // No maximumScale — blocking pinch-zoom fails WCAG 1.4.4 (resize text).
}

export const metadata: Metadata = {
  title: 'DOPA Faculty Management System',
  description: 'Internal FMS for DOPA Coaching',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DOPA FMS',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        {/* Apply saved theme before first paint — prevents flash. It sets data-theme on <html>
            ahead of hydration, which is why <html> carries suppressHydrationWarning. */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`
        }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
