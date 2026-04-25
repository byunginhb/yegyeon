import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import AppShell from '@/components/layout/AppShell'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '예견 — 한국 예측 시장',
  description: '누구나 미래 사건에 질문을 만들고, 포인트로 예측에 베팅하는 한국 예측 시장',
  keywords: ['예측 시장', '예견', 'prediction market', '베팅', '포인트'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: '예견 — 한국 예측 시장',
    description: '누구나 미래를 예측하고 포인트로 베팅할 수 있는 플랫폼',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: '/logo.png', width: 128, height: 128 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning className={figtree.variable}>
      <body className={`${figtree.variable} font-sans min-h-screen antialiased bg-canvas-100 text-ink-900`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>
            {children}
          </AppShell>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
