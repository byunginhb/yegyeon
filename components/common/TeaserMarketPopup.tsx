'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Market } from '@/types/index'

/** "오늘 하루 보지 않기" 만료 시각 (epoch ms) */
const HIDE_KEY = 'yegyeon:teaser:hideUntil'
/** 한 세션에 한 번만 노출 */
const SESSION_KEY = 'yegyeon:teaser:shown'
const DELAY_MS = 3000
/** 인기 마켓 상위 N개 중 랜덤 1개 */
const POOL_SIZE = 5

function isSuppressed(): boolean {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return true
    const until = Number(window.localStorage.getItem(HIDE_KEY) ?? 0)
    return Number.isFinite(until) && until > Date.now()
  } catch {
    // storage 사용 불가 — 노출 허용
    return false
  }
}

/**
 * 비로그인 방문자에게 3초 후 인기 마켓 1개를 팝업으로 보여주는 가입 유도 티저.
 * 팝업 안의 예측은 로컬 UI 상태일 뿐 실제 마켓/베팅 데이터에 전혀 반영되지 않는다.
 */
export default function TeaserMarketPopup() {
  const [market, setMarket] = useState<Market | null>(null)
  const [elapsed, setElapsed] = useState(false)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [vote, setVote] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    if (isSuppressed()) return

    let cancelled = false
    const timer = setTimeout(() => setElapsed(true), DELAY_MS)

    async function pickMarket() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      // 로그인 사용자에게는 가입 유도 팝업이 필요 없다
      if (session?.user || cancelled) return

      const res = await fetch('/api/markets?sort=trending&status=open&limit=20')
      const json = await res.json()
      if (!json.success || cancelled) return

      // 팝업 예측은 YES/NO 2지선다이므로 binary 마켓만 대상으로 한다
      const pool = (json.data as Market[]).filter((m) => m.type === 'binary').slice(0, POOL_SIZE)
      if (pool.length === 0 || cancelled) return

      setMarket(pool[Math.floor(Math.random() * pool.length)])
    }

    pickMarket().catch((error) => {
      console.error('티저 팝업 마켓을 불러오지 못했습니다:', error)
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    // shown 가드: 닫은 뒤 이 이펙트가 다시 열어버리는 것을 막는다
    if (!elapsed || !market || shown) return
    setShown(true)
    setOpen(true)
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // storage 사용 불가 — 무시
    }
  }, [elapsed, market, shown])

  function hideForToday() {
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    try {
      window.localStorage.setItem(HIDE_KEY, String(midnight.getTime()))
    } catch {
      // storage 사용 불가 — 무시
    }
    setOpen(false)
  }

  if (!market) return null

  const yesPercent = Math.round(market.yes_probability * 100)
  const noPercent = 100 - yesPercent

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogTitle className="pr-8 text-base leading-snug font-semibold text-ink-900">
          {market.title}
        </DialogTitle>

        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          {market.category && (
            <>
              <span className="font-medium" style={{ color: market.category.color }}>
                {market.category.name}
              </span>
              <span>·</span>
            </>
          )}
          <span className="inline-flex items-center gap-0.5">
            <Users className="h-3 w-3" />
            {market.unique_traders.toLocaleString()}명 참여
          </span>
        </div>

        {vote === null ? (
          <>
            <p className="text-sm text-ink-600">어떻게 예측하시나요?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVote('yes')}
                className="rounded-lg border border-teal-500/40 bg-teal-500/10 py-3 text-base font-bold text-teal-600 transition-colors hover:bg-teal-500/20"
              >
                예
              </button>
              <button
                type="button"
                onClick={() => setVote('no')}
                className="rounded-lg border border-scarlet-500/40 bg-scarlet-500/10 py-3 text-base font-bold text-scarlet-600 transition-colors hover:bg-scarlet-500/20"
              >
                아니오
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-700">
              <span
                className={cn(
                  'font-bold',
                  vote === 'yes' ? 'text-teal-600' : 'text-scarlet-600'
                )}
              >
                {vote === 'yes' ? '예' : '아니오'}
              </span>
              를 선택하셨어요. 현재 예측 진행 상황이에요.
            </p>

            <div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-canvas-100">
                <div className="bg-teal-500" style={{ width: `${yesPercent}%` }} />
                <div className="bg-scarlet-500" style={{ width: `${noPercent}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-sm font-semibold tabular-nums">
                <span className="text-teal-600">예 {yesPercent}%</span>
                <span className="text-scarlet-600">아니오 {noPercent}%</span>
              </div>
            </div>

            <p className="text-xs text-ink-400">
              미리보기 예측이라 실제 마켓 결과에는 반영되지 않아요.
            </p>

            <div className="border-t border-ink-200/60 pt-3 text-center">
              <p className="text-sm text-ink-600">
                인기 마켓부터 새로운 마켓까지, 더 많은 예측에 참여해보세요.
              </p>
              <Link
                href="/auth/signup"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                더 많은 마켓 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={hideForToday}
          className="text-xs text-ink-400 transition-colors hover:text-ink-600"
        >
          오늘 하루 보지 않기
        </button>
      </DialogContent>
    </Dialog>
  )
}
