import MarketListSkeleton from '@/components/market/MarketListSkeleton'
import PageShell from '@/components/layout/PageShell'

export default function Loading() {
  return (
    <PageShell>
      {/* 환영 배너 스켈레톤 */}
      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm h-28 mb-6 animate-pulse" />

      {/* 탭 스켈레톤 */}
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-ink-200/30 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-14 bg-ink-200/30 rounded-full animate-pulse" />
        ))}
      </div>

      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm overflow-hidden">
        <MarketListSkeleton count={6} />
      </div>
    </PageShell>
  )
}
