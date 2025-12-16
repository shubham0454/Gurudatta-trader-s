import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/Toast'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Gurudatta trader\'s - Admin Panel',
  description: 'Admin panel for Gurudatta trader\'s cow feed management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}

