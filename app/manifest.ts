import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '예견 — 한국 예측 시장',
    short_name: '예견',
    description:
      '예견(YEGYEON)은 누구나 미래 사건에 질문을 만들고, 내부 포인트로 예측에 예측하는 한국형 예측 시장 플랫폼입니다.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b10',
    theme_color: '#6366f1',
    orientation: 'portrait',
    lang: 'ko-KR',
    dir: 'ltr',
    categories: ['games', 'social', 'finance', 'news', 'entertainment'],
    icons: [
      {
        src: '/logo.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
