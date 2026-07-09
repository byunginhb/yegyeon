import PageShell from '@/components/layout/PageShell'

export default function ProfileLoading() {
  return (
    <PageShell>
      {/* 프로필 헤더 스켈레톤 */}
      <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6 mb-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-ink-200/50 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-ink-200/50 rounded w-40" />
            <div className="h-4 bg-ink-200/30 rounded w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-ink-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-6 bg-ink-200/40 rounded w-16 mx-auto" />
              <div className="h-3 bg-ink-200/30 rounded w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* 예측 목록 스켈레톤 */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-canvas-0 border border-ink-200 p-4 animate-pulse"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ink-200/50 rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-5 bg-ink-200/30 rounded-full w-12" />
                  <div className="h-5 bg-ink-200/30 rounded w-24" />
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="h-5 bg-ink-200/40 rounded w-16" />
                <div className="h-4 bg-ink-200/30 rounded w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
