'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'yegyeon_welcome_v1'

interface WelcomePopupProps {
  /** 디자인 시스템 등에서 강제로 띄울 때 사용 */
  forceShow?: boolean
}

/**
 * 신규 가입자 환영 팝업.
 * - forceShow=true: localStorage/session 무시하고 즉시 표시 (디자인시스템 미리보기용)
 * - 일반: 로그인 상태이고 localStorage에 dismiss 기록이 없을 때만 표시
 * - 한 번 닫으면 다시 뜨지 않음
 */
export default function WelcomePopup({ forceShow = false }: WelcomePopupProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (forceShow) {
      setOpen(true)
      return
    }

    if (localStorage.getItem(STORAGE_KEY)) return

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setOpen(true)
    })
  }, [forceShow])

  // 폭죽: 팝업이 열릴 때 3초간 화려하게
  useEffect(() => {
    if (!open) return

    const end = Date.now() + 3000
    const colors = ['#22c55e', '#fbbf24', '#3b82f6', '#ec4899', '#ffffff']
    let raf = 0

    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) raf = requestAnimationFrame(frame)
    }
    // 중앙 한 방 + 양옆 분수
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors })
    frame()

    return () => cancelAnimationFrame(raf)
  }, [open])

  const dismiss = () => {
    if (!forceShow) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 폭죽 이모지 + 타이머 배지 */}
        <div className="mb-4">
          <div className="text-5xl sm:text-6xl">🎉</div>
        </div>

        {/* 기간한정 배지 */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <span className="text-base leading-none">⚡</span>
          선착순 & 기간 한정
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-amber-300 text-balance leading-tight">
          100,000 포인트
          <br />
          <span className="text-lg sm:text-xl">적립 완료!</span>
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-zinc-300 text-balance">
          지금 가입하신 <span className="font-semibold text-amber-300">선착순 멤버</span>에게만
          {' '}100,000 포인트를 드립니다.
          <br />
          <span className="text-xs text-zinc-400">기간 한정 혜택 — 서둘러 마켓에 참여하세요!</span>
        </p>

        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          지금 시작하기
        </button>
      </div>
    </div>
  )
}
