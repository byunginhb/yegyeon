import { Suspense } from 'react'
import RightSidebar from './RightSidebar'

interface PageShellProps {
  children: React.ReactNode
  /** 우측 사이드바를 노출할지 (기본 true) */
  showRightSidebar?: boolean
  /** 본문 컬럼의 max-width 클래스 (기본 없음 = flex-1로 늘어남) */
  className?: string
}

/**
 * 모든 사용자 페이지의 공통 컨테이너.
 * 홈/탐색/랭킹/프로필 등은 동일한 컨테이너 폭/여백/우측 사이드바를 공유한다.
 */
export default function PageShell({
  children,
  showRightSidebar = true,
  className,
}: PageShellProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex gap-6">
        <div className={`flex-1 min-w-0 ${className ?? ''}`}>{children}</div>
        {showRightSidebar && (
          <Suspense fallback={null}>
            <RightSidebar />
          </Suspense>
        )}
      </div>
    </div>
  )
}
