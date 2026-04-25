import PageShell from '@/components/layout/PageShell'

export default function PortfolioLoading() {
  return (
    <PageShell>
      {/* 제목 스켈레톤 */}
      <div className="h-7 bg-ink-200/50 rounded w-40 mb-6 animate-pulse" />

      {/* 요약 카드 4칸 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-canvas-0/40 backdrop-blur-sm p-4 text-center animate-pulse"
          >
            <div className="h-8 bg-ink-200/40 rounded w-20 mx-auto mb-2" />
            <div className="h-3 bg-ink-200/30 rounded w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* 진행 중인 베팅 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 bg-ink-200/40 rounded animate-pulse" />
          <div className="h-5 bg-ink-200/50 rounded w-32 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-canvas-0/40 backdrop-blur-sm p-4 animate-pulse"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="h-4 bg-ink-200/50 rounded w-full mb-2" />
                  <div className="h-4 bg-ink-200/30 rounded w-3/4 mb-2" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-ink-200/30 rounded-full w-12" />
                    <div className="h-5 bg-ink-200/30 rounded w-20" />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="h-5 bg-ink-200/40 rounded w-16 mb-1" />
                  <div className="h-4 bg-ink-200/30 rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
