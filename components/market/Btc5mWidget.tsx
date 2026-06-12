'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Bitcoin, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PointIcon from '@/components/ui/PointIcon'
import { cn } from '@/lib/utils'

interface Round {
  id: string
  title: string
  open_price: number | null
  close_date: string
  yes_probability: number
  yes_amount: number
  no_amount: number
  yes_shares: number
  no_shares: number
  unique_traders: number
}
interface LastResult {
  resolution: string | null
  open_price: number | null
  close_price: number | null
}

const QUICK_AMOUNTS = [10, 50, 100]
const ROUND_SECONDS = 300 // 5분

function formatKRW(n: number | null): string {
  if (n == null) return '-'
  return Math.round(n).toLocaleString('ko-KR')
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Btc5mWidget() {
  const router = useRouter()
  const [round, setRound] = useState<Round | null>(null)
  const [last, setLast] = useState<LastResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [side, setSide] = useState<'YES' | 'NO' | null>(null)
  const [amount, setAmount] = useState(100)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const settlingRef = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/markets/btc-5m/current', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setRound(json.data.round)
        setLast(json.data.last)
      }
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false)
      settlingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
    const poll = setInterval(fetchData, 5000)
    return () => clearInterval(poll)
  }, [fetchData])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = round ? new Date(round.close_date).getTime() - now : 0

  useEffect(() => {
    if (round && remaining <= 0 && !settlingRef.current) {
      settlingRef.current = true
      const t = setTimeout(fetchData, 1500)
      return () => clearTimeout(t)
    }
  }, [round, remaining, fetchData])

  async function placeBet() {
    if (!round || submitting || !side) return
    if (remaining <= 0) {
      toast.error('이번 라운드가 마감됐어요. 다음 라운드를 기다려주세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: round.id, outcome: side, amount }),
      })
      if (res.status === 401) {
        toast.error('로그인이 필요합니다.')
        router.push('/auth/login')
        return
      }
      const json = await res.json()
      if (json.success) {
        toast.success(`${side === 'YES' ? '상승' : '하락'}에 ${amount.toLocaleString()}포인트 베팅 완료!`)
        fetchData()
      } else {
        toast.error(json.error ?? '베팅에 실패했습니다.')
      }
    } catch {
      toast.error('베팅에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-3 h-[210px] rounded-xl border border-ink-200/60 bg-canvas-0 animate-pulse" />
    )
  }
  if (!round) return null

  const yesPercent = Math.round((round.yes_probability ?? 0.5) * 100)
  const noPercent = 100 - yesPercent
  const closed = remaining <= 0
  const lastUp = last?.resolution?.toUpperCase() === 'YES'

  // 시간 감쇠 가중치 (남은시간/5분, [0.01,1]) — 늦게 걸수록 배당↓
  const weight = Math.min(1, Math.max(0.01, remaining / 1000 / ROUND_SECONDS))

  // 선택한 방향 기준 예상 수령액 (정산이 shares 비례이므로 동일 공식으로 미리보기)
  const expected = (() => {
    if (!side || amount <= 0) return null
    const total = round.yes_amount + round.no_amount
    const sideShares = side === 'YES' ? round.yes_shares : round.no_shares
    const myShares = amount * weight
    const denom = sideShares + myShares
    if (denom <= 0) return null
    const payout = Math.floor((myShares / denom) * (total + amount))
    const odds = payout / amount
    return { payout, odds }
  })()

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-50/80 to-canvas-0 dark:from-amber-950/20">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Bitcoin className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-ink-900">비트코인 5분 등락</span>
          <span className="inline-flex items-center rounded-full border border-ink-300 bg-canvas-0 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
            베타
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-scarlet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-scarlet-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-scarlet-500" />
            LIVE
          </span>
        </div>
        {last?.resolution && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium',
              lastUp ? 'text-teal-600' : 'text-scarlet-600'
            )}
          >
            직전 {lastUp ? '상승' : '하락'}
            {lastUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </span>
        )}
      </div>

      {/* 시작가 + 카운트다운 */}
      <div className="flex items-end justify-between px-4">
        <div>
          <p className="text-[11px] text-ink-400">라운드 시작가 · 업비트 BTC/KRW</p>
          <p className="text-lg font-bold tabular-nums text-ink-1000">
            ₩{formatKRW(round.open_price)}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-[11px] text-ink-400">
            <Timer className="h-3 w-3" /> 남은 시간
          </p>
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              closed ? 'text-ink-400' : remaining < 30000 ? 'text-scarlet-600' : 'text-ink-1000'
            )}
          >
            {closed ? '정산 중…' : formatCountdown(remaining)}
          </p>
        </div>
      </div>

      {/* 확률 바 */}
      <div className="mt-2 px-4">
        <div className="flex h-6 overflow-hidden rounded-md text-[11px] font-bold text-white">
          <div
            className="flex items-center justify-start bg-teal-500 pl-2 transition-all"
            style={{ width: `${Math.max(yesPercent, 12)}%` }}
          >
            {yesPercent}%
          </div>
          <div
            className="flex items-center justify-end bg-scarlet-500 pr-2 transition-all"
            style={{ width: `${Math.max(noPercent, 12)}%` }}
          >
            {noPercent}%
          </div>
        </div>
      </div>

      {/* 베팅: 1) 방향 선택 → 2) 금액 → 3) 베팅 */}
      <div className="mt-3 px-4 pb-3">
        {/* 1) 방향 선택 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('YES')}
            disabled={closed}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-lg border-2 py-2 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              side === 'YES'
                ? 'border-teal-500 bg-teal-500 text-white shadow-sm'
                : 'border-teal-500/40 bg-teal-500/5 text-teal-600 hover:bg-teal-500/10'
            )}
          >
            <TrendingUp className="h-4 w-4" /> 상승
          </button>
          <button
            type="button"
            onClick={() => setSide('NO')}
            disabled={closed}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-lg border-2 py-2 text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              side === 'NO'
                ? 'border-scarlet-500 bg-scarlet-500 text-white shadow-sm'
                : 'border-scarlet-500/40 bg-scarlet-500/5 text-scarlet-600 hover:bg-scarlet-500/10'
            )}
          >
            <TrendingDown className="h-4 w-4" /> 하락
          </button>
        </div>

        {/* 2) 금액 선택 */}
        <div className="mt-2 flex items-center gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-0.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors cursor-pointer tabular-nums',
                amount === a
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-ink-200 bg-canvas-0 text-ink-500 hover:border-ink-400'
              )}
            >
              <PointIcon size={11} />
              {a.toLocaleString()}
            </button>
          ))}
        </div>

        {/* 예상 수령액 + 시간 감쇠 안내 */}
        <div className="mt-2 rounded-lg bg-canvas-0/70 px-3 py-2 text-center">
          {side && expected ? (
            <p className="flex items-center justify-center gap-1 text-xs text-ink-700">
              <span className={side === 'YES' ? 'font-semibold text-teal-600' : 'font-semibold text-scarlet-600'}>
                {side === 'YES' ? '상승' : '하락'}
              </span>
              적중 시 예상
              <span className="inline-flex items-center gap-0.5 font-bold text-ink-1000 tabular-nums">
                <PointIcon size={12} />
                {expected.payout.toLocaleString()}
              </span>
              <span className="text-ink-400">({expected.odds.toFixed(2)}배)</span>
            </p>
          ) : (
            <p className="text-xs text-ink-400">방향을 선택하면 예상 배당이 표시됩니다</p>
          )}
          <p className="mt-0.5 text-[10px] text-ink-400">
            현재 배당 가중치 {Math.round(weight * 100)}% · 시간이 지날수록 배당이 낮아집니다
          </p>
        </div>

        {/* 3) 베팅 버튼 */}
        <Button
          type="button"
          onClick={placeBet}
          disabled={closed || submitting || !side}
          className="mt-2 w-full font-bold"
        >
          {closed
            ? '정산 중…'
            : submitting
              ? '베팅 중…'
              : side
                ? `${side === 'YES' ? '상승' : '하락'}에 베팅하기`
                : '방향을 선택하세요'}
        </Button>

        <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-400">
          가격 출처:{' '}
          <a
            href="https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-500 underline underline-offset-2 hover:text-primary"
          >
            업비트(Upbit) KRW-BTC 실시간 체결가
          </a>
          {' '}· 5분마다 자동 정산
        </p>
        <Link
          href={`/market/${round.id}`}
          className="mt-1 block text-center text-[11px] text-ink-400 hover:text-primary transition-colors"
        >
          라운드 상세 보기 →
        </Link>
      </div>
    </div>
  )
}
