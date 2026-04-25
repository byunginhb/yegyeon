export default function MarketDetailLoading() {
  return (
    <main className="min-h-screen bg-canvas-100">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 카테고리 + 상태 스켈레톤 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 bg-ink-100 rounded w-20 animate-pulse" />
          <div className="h-5 bg-ink-100 rounded-full w-16 animate-pulse" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 왼쪽: 마켓 상세 스켈레톤 */}
          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <div className="space-y-2 mb-4">
              <div className="h-7 bg-ink-200 rounded w-full animate-pulse" />
              <div className="h-7 bg-ink-200 rounded w-4/5 animate-pulse" />
            </div>

            {/* 설명 */}
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-ink-100 rounded w-full animate-pulse" />
              <div className="h-4 bg-ink-100 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-ink-100 rounded w-3/4 animate-pulse" />
            </div>

            {/* 통계 3칸 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-canvas-0 rounded-xl border border-ink-200 p-4 text-center animate-pulse"
                >
                  <div className="h-4 w-4 bg-ink-100 rounded mx-auto mb-2" />
                  <div className="h-6 bg-ink-200 rounded w-20 mx-auto mb-1" />
                  <div className="h-3 bg-ink-100 rounded w-12 mx-auto" />
                </div>
              ))}
            </div>

            {/* 생성자 정보 */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-4 w-4 bg-ink-100 rounded animate-pulse" />
              <div className="h-4 bg-ink-100 rounded w-48 animate-pulse" />
            </div>

            {/* 댓글 섹션 스켈레톤 */}
            <div className="mt-8">
              <div className="h-5 bg-ink-200 rounded w-24 mb-4 animate-pulse" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-canvas-0 border border-ink-200 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 bg-ink-100 rounded-full" />
                      <div className="h-4 bg-ink-100 rounded w-24" />
                    </div>
                    <div className="h-4 bg-ink-100 rounded w-full mb-1" />
                    <div className="h-4 bg-ink-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 베팅 패널 스켈레톤 */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-canvas-0 border border-ink-200 rounded-xl p-5 animate-pulse">
              {/* 확률 바 */}
              <div className="flex justify-between mb-2">
                <div className="h-5 bg-teal-100 rounded w-16" />
                <div className="h-5 bg-scarlet-100 rounded w-16" />
              </div>
              <div className="h-3 bg-ink-100 rounded-full mb-5" />

              {/* YES/NO 버튼 */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="h-10 bg-teal-100 rounded-lg" />
                <div className="h-10 bg-scarlet-100 rounded-lg" />
              </div>

              {/* 금액 입력 */}
              <div className="h-10 bg-ink-100 rounded-lg mb-3" />

              {/* 베팅 버튼 */}
              <div className="h-11 bg-ink-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
