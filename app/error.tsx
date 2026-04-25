'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 Sentry 등으로 대체)
    console.error('Global error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-canvas-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-canvas-0 border border-ink-200 rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-scarlet-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-scarlet-500" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-ink-1000 mb-2">
            오류가 발생했습니다
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            예기치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              다시 시도
            </button>
            <a
              href="/"
              className="px-5 py-2.5 bg-ink-100 text-ink-700 text-sm font-medium rounded-lg hover:bg-ink-200 transition-colors"
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
