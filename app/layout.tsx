import type { Metadata } from 'next'
import { Orbitron, Exo_2, Rajdhani } from 'next/font/google'
import { AppProviders } from '@/src/app/providers'
import { ToastContainer } from '@/src/shared/components/ui/Toast'
import '@/src/index.css'

// Optimize Google Fonts with Next.js font loader
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-orbitron',
  display: 'swap',
})

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-exo2',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CyberPoker',
  description: 'Premium Cyberpunk Poker Game',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable} ${rajdhani.variable}`}>
      <body>
        <AppProviders>
          {children}
          <ToastContainer />
        </AppProviders>
      </body>
    </html>
  )
}
