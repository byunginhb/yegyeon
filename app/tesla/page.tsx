import type { Metadata } from 'next'
import TeslaHoguPage from '@/components/tesla/TeslaHoguPage'
import teslaData from '@/docs/tesla/tesla_hogu_local_data.json'
import type { TeslaData } from '@/types/tesla'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yegyeon.com'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: { absolute: '테슬라 호구연대표 — 한국 Tesla 연식·트림 비교' },
  description:
    '한국에 출시된 Tesla Model 3·Model Y의 연식, 트림, 등록대수, 하드웨어 세대와 밈·비교용 호구점수를 한 화면에서 비교하세요.',
  keywords: [
    '테슬라 호구연대표',
    '테슬라 연식 비교',
    'Model 3 비교',
    'Model Y 비교',
    '테슬라 등록대수',
    '테슬라 트림',
  ],
  alternates: { canonical: '/tesla' },
  openGraph: {
    title: '테슬라 호구연대표',
    description: '한국 출시 Tesla의 연식·트림·등록대수·세대 차이를 한 화면에서 비교합니다.',
    type: 'website',
    url: '/tesla',
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: teslaData.meta.serviceName,
  description: teslaData.meta.disclaimer,
  url: `${SITE_URL}/tesla`,
  dateModified: teslaData.meta.asOf,
  spatialCoverage: '대한민국',
  temporalCoverage: '2019/2026',
  creator: {
    '@type': 'Organization',
    name: teslaData.meta.serviceName,
  },
}

export default function TeslaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <TeslaHoguPage data={teslaData as TeslaData} />
    </>
  )
}
