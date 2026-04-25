'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

/**
 * 모바일 전용 상단 바 (lg 미만에서만 노출).
 * 로고 + 테마 토글 + (간단한 액션) 위치.
 * lg+ 데스크탑은 LeftSidebar가 같은 역할을 한다.
 */
export default function MobileTopBar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-12 px-4 bg-canvas-100/85 backdrop-blur border-b border-ink-200/40 lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="예견" width={26} height={26} className="rounded-md" />
        <span className="font-bold text-base text-ink-1000 tracking-tight">예견</span>
      </Link>

      {mounted && (
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full text-ink-600 hover:bg-canvas-0/60 hover:text-ink-900 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      )}
    </header>
  )
}
