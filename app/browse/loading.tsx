import MarketListSkeleton from '@/components/market/MarketListSkeleton'
import PageShell from '@/components/layout/PageShell'

export default function BrowseLoading() {
  return (
    <PageShell>
      {/* 페이지 헤더 스켈레톤 */}
      <div className="mb-5">
        <div className="h-7 bg-ink-200/50 rounded w-28 mb-2 animate-pulse" />
        <div className="h-4 bg-ink-200/40 rounded w-40 animate-pulse" />
      </div>

      {/* 검색창 스켈레톤 */}
      <div className="h-10 bg-ink-200/30 rounded-lg mb-4 animate-pulse" />

      {/* 카테고리 탭 스켈레톤 */}
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-ink-200/30 rounded-full animate-pulse" />
        ))}
      </div>

      {/* 정렬 탭 스켈레톤 */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-14 bg-ink-200/30 rounded-full animate-pulse" />
        ))}
      </div>

      {/* 결과 */}
      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm overflow-hidden">
        <MarketListSkeleton count={8} />
      </div>
    </PageShell>
  )
}
