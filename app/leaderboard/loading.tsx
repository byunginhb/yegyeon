import PageShell from '@/components/layout/PageShell'

export default function LeaderboardLoading() {
  return (
    <PageShell>
      {/* 제목 스켈레톤 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-6 w-6 bg-ink-200/50 rounded animate-pulse" />
        <div className="h-7 bg-ink-200/50 rounded w-20 animate-pulse" />
      </div>

      {/* 탭 스켈레톤 */}
      <div className="flex gap-1 bg-ink-200/30 rounded-lg p-1 mb-6 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-8 bg-canvas-0/40 rounded-md" />
        ))}
      </div>

      {/* 리더보드 테이블 스켈레톤 */}
      <div className="rounded-2xl bg-canvas-0/40 backdrop-blur-sm overflow-hidden">
        <ul className="divide-y divide-ink-200/40">
          {Array.from({ length: 10 }).map((_, i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 animate-pulse"
            >
              <div className="w-6 h-5 bg-ink-200/40 rounded" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-ink-200/40 rounded-full shrink-0" />
                <div>
                  <div className="h-4 bg-ink-200/50 rounded w-24 mb-1" />
                  <div className="h-3 bg-ink-200/40 rounded w-16" />
                </div>
              </div>
              <div className="h-5 bg-ink-200/40 rounded w-20" />
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  )
}
