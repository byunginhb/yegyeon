import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: '예견 — 한국 예측 시장 | 정치·경제·스포츠·코인 미래 예측 베팅',
  description:
    '예견(YEGYEON) 홈. 정치(대선·선거), 경제(주식·환율·금리), 스포츠(축구·야구·KBO·월드컵), 연예, 코인(비트코인·이더리움), 게임(LoL·롤드컵), 기술(AI) 등 다양한 분야의 예측 마켓에서 YES/NO·확률 베팅에 참여하고 집단지성으로 미래를 예측하세요. 가입 즉시 무료 포인트 지급.',
  keywords: [
    '예견', '예측 시장', '예측마켓', '한국 예측 시장', 'YEGYEON',
    '정치 예측', '대선 예측', '경제 예측', '주식 예측',
    '스포츠 예측', 'KBO 예측', '월드컵 예측',
    '코인 예측', '비트코인 예측', '이더리움 예측',
    '연예 예측', '게임 예측', 'LoL 예측',
    'YES NO 베팅', '확률 베팅', '미래 예측', '집단지성',
    'prediction market', 'Manifold', 'Polymarket',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: '예견 — 한국 예측 시장',
    description: '정치·경제·스포츠·코인·연예·게임 등 모든 미래를 예측하고 포인트로 베팅하는 한국형 예측 플랫폼.',
    type: 'website',
    url: '/',
  },
}

import FilterBar from '@/components/market/FilterBar'
import Btc5mWidget from '@/components/market/Btc5mWidget'
import MarketMarquee from '@/components/marquee/MarketMarquee'
import MarketList from '@/components/market/MarketList'
import MarketListSkeleton from '@/components/market/MarketListSkeleton'
import HomeHeader from '@/components/home/HomeHeader'
import PageShell from '@/components/layout/PageShell'
import MobileGamificationStrip from '@/components/gamification/MobileGamificationStrip'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Category, Market } from '@/types/index'

interface HomePageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
    page?: string
    q?: string
  }>
}

// BTC 5분 위젯은 관리자에게만 노출 (베타)
async function isAdminViewer(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await adminSupabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    return data?.role === 'admin'
  } catch {
    return false
  }
}

async function fetchCategories(): Promise<Category[]> {
  const { data } = await adminSupabase
    .from('categories')
    .select('id, name, slug, icon, color, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  return (data as Category[]) ?? []
}

async function fetchMarkets(params: {
  category?: string
  sort?: string
  page?: string
  q?: string
}): Promise<Market[]> {
  const sort = params.sort || 'trending'
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const limit = 20
  const offset = (page - 1) * limit

  let query = adminSupabase
    .from('markets')
    .select(
      `id, slug, title, description, thumbnail_url, type, status, creator_id, category_id,
       close_date, resolved_at, resolution, total_volume, unique_traders,
       comment_count, yes_probability, yes_amount, no_amount, is_hidden,
       tags, created_at, updated_at,
       creator:users!creator_id(id, username, display_name, avatar_url),
       category:categories!category_id(id, name, slug, icon, color),
       options:market_options(id, text, color, image_url, probability, total_amount, sort_order)`
    )
    .eq('is_hidden', false)
    .eq('status', 'open')
    .is('auto_kind', null) // 자동 마켓(BTC 5분 등)은 전용 위젯에서만 노출

  if (params.category && params.category !== 'all') {
    const { data: cat } = await adminSupabase
      .from('categories')
      .select('id')
      .eq('slug', params.category)
      .single()
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  // 검색어 필터 (title ilike)
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim().replace(/[%_]/g, (m) => `\\${m}`)
    query = query.ilike('title', `%${searchTerm}%`)
  }

  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'closing_soon':
      query = query.order('close_date', { ascending: true })
      break
    case 'volume':
      query = query.order('total_volume', { ascending: false })
      break
    default:
      query = query.order('unique_traders', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data } = await query
  return (data as unknown as Market[]) ?? []
}

async function MarketsSection({
  category,
  sort,
  page,
  q,
}: {
  category?: string
  sort?: string
  page?: string
  q?: string
}) {
  const markets = await fetchMarkets({ category, sort, page, q })
  const emptyMessage = q
    ? `"${q}" 검색 결과가 없습니다.`
    : '열린 마켓이 없습니다.'
  return <MarketList markets={markets} emptyMessage={emptyMessage} />
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const [categories, isAdmin] = await Promise.all([fetchCategories(), isAdminViewer()])

  return (
    <PageShell>
      <Suspense fallback={null}>
        <HomeHeader />
      </Suspense>

      {/* 모바일 전용: 출석·퀘스트 스트립 (xl 이상은 RightSidebar에서 표시) */}
      <MobileGamificationStrip />

      {/* 비트코인 5분 등락 — 관리자 전용(베타). 자동 생성/정산되는 단기 라운드 위젯 */}
      {isAdmin && <Btc5mWidget />}

      {/* 인기 마켓 marquee — 카테고리 탭 바로 위에서 흐름 */}
      <MarketMarquee />

      {/* 통합 필터 바: 검색 + 카테고리 + 정렬 */}
      <Suspense fallback={null}>
        <FilterBar categories={categories} />
      </Suspense>

      {/* 마켓 목록 */}
      <div className="rounded-xl border border-ink-200/60 bg-canvas-0 overflow-hidden">
        <Suspense fallback={<MarketListSkeleton count={8} />}>
          <MarketsSection
            category={params.category}
            sort={params.sort}
            page={params.page}
            q={params.q}
          />
        </Suspense>
      </div>
    </PageShell>
  )
}
