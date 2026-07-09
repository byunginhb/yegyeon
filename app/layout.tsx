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

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yegyeon.com'
const SITE_NAME = '예견 (YEGYEON)'
const SITE_TITLE = '예견 — 한국 예측 시장 플랫폼 | YES/NO 예측·확률 예측·미래 예측'
const SITE_DESC =
  '예견(YEGYEON)은 누구나 미래 사건에 질문을 만들고, 내부 포인트로 예측에 예측하는 한국형 예측 시장 플랫폼입니다. 정치·경제·스포츠·연예·코인·기술·게임 등 다양한 주제의 마켓에서 집단지성으로 확률을 예측하고, 정확한 예측에 보상이 따릅니다. 실제 화폐 거래 없이 안전하게 예측 게임을 즐겨보세요.'

const SEO_KEYWORDS = [
  // 핵심 브랜드
  '예견', 'YEGYEON', '예견 마켓', '예견 예측', '예견닷컴',
  // 핵심 카테고리
  '예측 시장', '예측마켓', '한국 예측 시장', '한국 예측마켓', '예측 플랫폼', '예측 게임', '예측 사이트',
  'prediction market', 'prediction markets', 'korea prediction market',
  // Manifold/Polymarket 유사 키워드
  '맨이폴드', 'Manifold', 'Manifold Markets', '폴리마켓', 'Polymarket', 'Kalshi', 'Metaculus',
  '맨이폴드 한국', '폴리마켓 한국',
  // 기능/액션
  '예측', '예측 사이트', '확률 예측', '미래 예측', '온라인 예측', '재미있는 예측',
  'YES NO 예측', 'YES/NO', '예스 노 예측', '바이너리 마켓',
  '다중 선택 마켓', '수치 마켓', '스칼라 마켓', '이진 마켓',
  // 도메인 키워드
  '미래 예측', '미래 예측 사이트', '확률', '확률 예측', '집단 지성', '집단지성',
  '실시간 확률', '시장 확률',
  // 주제별 마켓
  '정치 예측', '대선 예측', '선거 예측', '국회의원 선거', '대통령 선거',
  '경제 예측', '주식 예측', '환율 예측', '금리 예측',
  '스포츠 예측', '축구 예측', '야구 예측', '농구 예측', '월드컵 예측', 'KBO 예측',
  '연예 예측', '연예인 예측', '드라마 예측', '예능 예측',
  '코인 예측', '비트코인 예측', '이더리움 예측', '암호화폐 예측', '코인 가격 예측',
  '게임 예측', 'e스포츠 예측', 'LoL 예측', '롤드컵 예측',
  '날씨 예측', '기술 예측', 'AI 예측',
  // 보상/포인트
  '포인트', '포인트 게임', '리워드', '리더보드', '랭킹', '집단지성 보상',
  '무료 예측', '가상 포인트',
  // SEO 보조
  '예측 커뮤니티', '예측 SNS', '온라인 예측', '미래 시나리오', '집단 의사결정',
  '확률 시각화', '시장 메커니즘', 'AMM', '파리뮤추얼', 'parimutuel',
  // 부가
  '재미있는 사이트', '예측 챌린지', '예측 대회', '예측 토너먼트',
]

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | 예견 (YEGYEON)',
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  generator: 'Next.js',
  keywords: SEO_KEYWORDS,
  authors: [{ name: '예견 운영팀', url: SITE_URL }],
  creator: '예견 (YEGYEON)',
  publisher: '예견 (YEGYEON)',
  category: '예측 시장 / 게임 / 커뮤니티',
  classification: 'Prediction Market, Forecasting, Korean Community Platform',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180' }],
    shortcut: '/logo.png',
  },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ko-KR': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: '예견 — 한국 예측 시장 플랫폼',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? '',
    },
  },
  other: {
    'theme-color': '#6366f1',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': '예견',
    'mobile-web-app-capable': 'yes',
  },
}

const JSON_LD_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: ['예견', 'YEGYEON', '한국 예측 시장'],
  url: SITE_URL,
  description: SITE_DESC,
  inLanguage: 'ko-KR',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/browse?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

const JSON_LD_ORG = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  alternateName: '예견',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: SITE_DESC,
  foundingDate: '2026',
  sameAs: [SITE_URL],
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

        {/* JSON-LD: WebSite */}
        <Script
          id="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_WEBSITE) }}
        />
        {/* JSON-LD: Organization */}
        <Script
          id="jsonld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORG) }}
        />
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
