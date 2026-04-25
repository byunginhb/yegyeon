import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center">
              <SearchX className="h-7 w-7 text-primary" />
            </div>
          </div>

          <p className="text-5xl font-bold text-ink-200 mb-2">404</p>
          <h1 className="text-xl font-bold text-ink-1000 mb-2">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>

          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  )
}
