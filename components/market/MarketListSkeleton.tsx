export default function MarketListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-canvas-0 border border-ink-200 rounded-xl p-4 animate-pulse"
        >
          {/* 배지 */}
          <div className="h-5 bg-ink-100 rounded-full w-16 mb-2" />
          {/* 제목 */}
          <div className="h-4 bg-ink-200 rounded w-4/5 mb-1.5" />
          <div className="h-4 bg-ink-100 rounded w-3/5 mb-3" />
          {/* 확률 바 */}
          <div className="flex justify-between mb-1">
            <div className="h-3 bg-teal-100 rounded w-12" />
            <div className="h-3 bg-scarlet-100 rounded w-12" />
          </div>
          <div className="h-2 bg-ink-100 rounded-full mb-3" />
          {/* 메타 */}
          <div className="flex justify-between">
            <div className="h-3 bg-ink-100 rounded w-24" />
            <div className="h-3 bg-ink-100 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
