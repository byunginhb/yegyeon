import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default function MarketNotFound() {
  return (
    <main className="min-h-screen bg-canvas-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-ink-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-ink-400" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-ink-1000 mb-2">
            마켓을 찾을 수 없습니다
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            해당 마켓이 존재하지 않거나 숨겨진 상태입니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/browse"
              className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              마켓 탐색하기
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 bg-ink-100 text-ink-700 text-sm font-medium rounded-lg hover:bg-ink-200 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
