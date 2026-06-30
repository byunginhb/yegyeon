'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'yegyeon_welcome_v1'

/**
 * 신규 가입자 환영 팝업.
 * - 로그인 상태이고 localStorage에 dismiss 기록이 없을 때만 표시
 * - 한 번 닫으면 다시 뜨지 않음
 */
export default function WelcomePopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setOpen(true)
    })
  }, [])

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
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={dismiss}
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="bg-gradient-to-r from-amber-300 to-emerald-400 bg-clip-text text-2xl font-bold text-transparent">
          100,000 포인트 적립 완료!
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          선착순 가입 이벤트 혜택으로 100,000 포인트가 지급되었습니다.
          마켓에 참여해보세요!
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
