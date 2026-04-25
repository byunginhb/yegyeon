import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: '예견 — 한국 예측 시장',
  description: '예측으로 지식을 증명하세요. 정치, 경제, 스포츠, 테크 등 다양한 마켓에 참여하세요.',
  openGraph: {
    title: '예견 — 한국 예측 시장',
    description: '예측으로 지식을 증명하세요.',
    type: 'website',
  },
}

import CategoryTabs from '@/components/market/CategoryTabs'
import SortTabs from '@/components/market/SortTabs'
import MarketList from '@/components/market/MarketList'
import MarketListSkeleton from '@/components/market/MarketListSkeleton'
import HomeHeader from '@/components/home/HomeHeader'
import PageShell from '@/components/layout/PageShell'
import { adminSupabase } from '@/lib/supabase/admin'
import type { Market } from '@/types/index'

interface HomePageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
    page?: string
  }>
}

async function fetchMarkets(params: {
  category?: string
  sort?: string
  page?: string
}): Promise<Market[]> {
  const sort = params.sort || 'trending'
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const limit = 20
  const offset = (page - 1) * limit

  let query = adminSupabase
    .from('markets')
    .select(
      `id, slug, title, description, type, status, creator_id, category_id,
       close_date, resolved_at, resolution, total_volume, unique_traders,
       comment_count, yes_probability, yes_amount, no_amount, is_hidden,
       tags, created_at, updated_at,
       creator:users!creator_id(id, username, display_name, avatar_url),
       category:categories!category_id(id, name, slug, icon, color),
       options:market_options(id, text, color, probability, total_amount, sort_order)`
    )
    .eq('is_hidden', false)
    .eq('status', 'open')

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
}: {
  category?: string
  sort?: string
  page?: string
}) {
  const markets = await fetchMarkets({ category, sort, page })
  return <MarketList markets={markets} emptyMessage="열린 마켓이 없습니다." />
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  return (
    <PageShell>
      <Suspense fallback={null}>
        <HomeHeader />
      </Suspense>

      {/* 필터 탭 */}
      <div className="flex flex-col gap-2 mb-3">
        <Suspense>
          <CategoryTabs />
        </Suspense>
        <Suspense>
          <SortTabs />
        </Suspense>
      </div>

      {/* 마켓 목록 */}
      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm overflow-hidden">
        <Suspense fallback={<MarketListSkeleton count={8} />}>
          <MarketsSection
            category={params.category}
            sort={params.sort}
            page={params.page}
          />
        </Suspense>
      </div>
    </PageShell>
  )
}
