import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Search } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'

export const metadata: Metadata = {
  title: '마켓 탐색 — 정치·경제·스포츠·코인·연예·게임 예측 마켓 모음',
  description:
    '예견의 모든 예측 마켓을 카테고리·인기순·최신순·마감임박·거래량으로 탐색하세요. 정치(대선·선거), 경제(주식·환율), 스포츠(축구·야구·KBO), 연예, 코인(비트코인), 게임(LoL), 기술(AI) 분야의 YES/NO·다중 선택·수치 예측 마켓을 한 곳에서 검색·필터링·정렬할 수 있습니다.',
  keywords: [
    '마켓 탐색', '예측 마켓 검색', '카테고리별 예측', '인기 예측 마켓',
    '마감임박 마켓', '신규 마켓', '거래량 마켓',
    '정치 마켓', '스포츠 마켓', '코인 마켓', '경제 마켓', '연예 마켓', '게임 마켓',
    '예견', 'YEGYEON', '한국 예측 시장',
  ],
  alternates: { canonical: '/browse' },
  openGraph: {
    title: '마켓 탐색 — 예견',
    description: '카테고리·정렬·검색으로 한국 예측 시장의 모든 마켓을 한 번에 둘러보세요.',
    type: 'website',
    url: '/browse',
  },
}

import CategoryTabs from '@/components/market/CategoryTabs'
import SortTabs from '@/components/market/SortTabs'
import MarketList from '@/components/market/MarketList'
import MarketListSkeleton from '@/components/market/MarketListSkeleton'
import Pagination from '@/components/market/Pagination'
import SearchInput from '@/components/market/SearchInput'
import { adminSupabase } from '@/lib/supabase/admin'
import type { Market } from '@/types/index'

interface BrowsePageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
    page?: string
    search?: string
  }>
}

interface FetchResult {
  markets: Market[]
  total: number
}

const LIMIT = 20

async function fetchMarkets(params: {
  category?: string
  sort?: string
  page?: string
  search?: string
}): Promise<FetchResult> {
  const sort = params.sort || 'trending'
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const offset = (page - 1) * LIMIT

  let query = adminSupabase
    .from('markets')
    .select(
      `id, slug, title, description, thumbnail_url, type, status, creator_id, category_id,
       close_date, resolved_at, resolution, total_volume, unique_traders,
       comment_count, yes_probability, yes_amount, no_amount, is_hidden,
       tags, created_at, updated_at,
       creator:users!creator_id(id, username, display_name, avatar_url),
       category:categories!category_id(id, name, slug, icon, color)`,
      { count: 'exact' }
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

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`)
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

  query = query.range(offset, offset + LIMIT - 1)

  const { data, count } = await query
  return {
    markets: (data as unknown as Market[]) ?? [],
    total: count ?? 0,
  }
}

async function BrowseResults({
  category,
  sort,
  page,
  search,
}: {
  category?: string
  sort?: string
  page?: string
  search?: string
}) {
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const { markets, total } = await fetchMarkets({ category, sort, page, search })

  return (
    <>
      <p className="text-xs text-ink-500 mb-3">
        총 <span className="font-semibold text-ink-700">{total.toLocaleString()}</span>개의 마켓
        {search && (
          <span>
            {' '}— &ldquo;<span className="text-primary font-medium">{search}</span>&rdquo; 검색 결과
          </span>
        )}
      </p>
      <MarketList
        markets={markets}
        emptyMessage={search ? `"${search}"에 대한 마켓이 없습니다.` : '마켓이 없습니다.'}
      />
      <Suspense>
        <Pagination total={total} page={currentPage} limit={LIMIT} />
      </Suspense>
    </>
  )
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams

  return (
    <PageShell>
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink-900 mb-1">탐색</h1>
        <p className="text-sm text-ink-500">모든 예측 마켓을 찾아보세요.</p>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <Suspense>
          <SearchInput defaultValue={params.search} />
        </Suspense>
      </div>

      {/* 카테고리 + 정렬 탭 */}
      <Suspense>
        <CategoryTabs className="mb-2" />
      </Suspense>
      <Suspense>
        <SortTabs className="mb-4" />
      </Suspense>

      {/* 결과 */}
      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm overflow-hidden">
        <Suspense fallback={<MarketListSkeleton count={8} />}>
          <BrowseResults
            category={params.category}
            sort={params.sort}
            page={params.page}
            search={params.search}
          />
        </Suspense>
      </div>
    </PageShell>
  )
}
