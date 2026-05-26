import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/ui/Providers'

export const metadata: Metadata = {
  title: 'DOPA Faculty Management System',
  description: 'Internal FMS for DOPA Coaching',
  icons: { icon: '/DOPA-Logo.png', apple: '/DOPA-Logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
