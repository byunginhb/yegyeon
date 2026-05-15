import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import AppShell from '@/components/layout/AppShell'
import './globals.css'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PHFX93KF'
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-NWLN864FZE'

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
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* End Google Tag Manager */}

        {/* Google tag (gtag.js) */}
        <Script
          id="gtag-src"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
          }}
        />
        {/* End Google tag */}
      </head>
      <body className={`${figtree.variable} font-sans min-h-screen antialiased bg-canvas-100 text-ink-900`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
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
