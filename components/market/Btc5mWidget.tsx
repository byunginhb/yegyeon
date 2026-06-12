'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Bitcoin, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Round {
  id: string
  title: string
  open_price: number | null
  close_date: string
  yes_probability: number
  yes_amount: number
  no_amount: number
  unique_traders: number
}
interface LastResult {
  resolution: string | null
  open_price: number | null
  close_price: number | null
}

const QUICK_AMOUNTS = [10, 50, 100]

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
  const [amount, setAmount] = useState(100)
  const [submitting, setSubmitting] = useState<'YES' | 'NO' | null>(null)
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
    // 베팅 풀/확률 갱신용 폴링
    const poll = setInterval(fetchData, 5000)
    return () => clearInterval(poll)
  }, [fetchData])

  // 1초 카운트다운 틱
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = round ? new Date(round.close_date).getTime() - now : 0

  // 마감되면 정산을 기다리며 짧은 간격으로 폴링 (새 라운드 등장까지)
  useEffect(() => {
    if (round && remaining <= 0 && !settlingRef.current) {
      settlingRef.current = true
      const t = setTimeout(fetchData, 1500)
      return () => clearTimeout(t)
    }
  }, [round, remaining, fetchData])

  async function bet(outcome: 'YES' | 'NO') {
    if (!round || submitting) return
    if (remaining <= 0) {
      toast.error('이번 라운드가 마감됐어요. 다음 라운드를 기다려주세요.')
      return
    }
    setSubmitting(outcome)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: round.id, outcome, amount }),
      })
      if (res.status === 401) {
        toast.error('로그인이 필요합니다.')
        router.push('/auth/login')
        return
      }
      const json = await res.json()
      if (json.success) {
        toast.success(`${outcome === 'YES' ? '상승' : '하락'}에 ₣${amount.toLocaleString()} 베팅 완료!`)
        fetchData()
      } else {
        toast.error(json.error ?? '베팅에 실패했습니다.')
      }
    } catch {
      toast.error('베팅에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="mb-3 h-[168px] rounded-xl border border-ink-200/60 bg-canvas-0 animate-pulse" />
    )
  }
  if (!round) return null

  const yesPercent = Math.round((round.yes_probability ?? 0.5) * 100)
  const noPercent = 100 - yesPercent
  const closed = remaining <= 0
  const lastUp = last?.resolution?.toUpperCase() === 'YES'

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-50/80 to-canvas-0 dark:from-amber-950/20">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Bitcoin className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-ink-900">비트코인 5분 등락</span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-scarlet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-scarlet-600">
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
          <p className="text-[11px] text-ink-400">라운드 시작가</p>
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

      {/* 빠른 베팅 */}
      <div className="mt-3 px-4 pb-3">
        <div className="mb-2 flex items-center gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors cursor-pointer',
                amount === a
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-ink-200 bg-canvas-0 text-ink-500 hover:border-ink-400'
              )}
            >
              ₣{a}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => bet('YES')}
            disabled={closed || submitting !== null}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold"
          >
            <TrendingUp className="mr-1 h-4 w-4" />
            {submitting === 'YES' ? '베팅 중…' : '상승'}
          </Button>
          <Button
            type="button"
            onClick={() => bet('NO')}
            disabled={closed || submitting !== null}
            className="bg-scarlet-500 hover:bg-scarlet-600 text-white font-bold"
          >
            <TrendingDown className="mr-1 h-4 w-4" />
            {submitting === 'NO' ? '베팅 중…' : '하락'}
          </Button>
        </div>
        <Link
          href={`/market/${round.id}`}
          className="mt-2 block text-center text-[11px] text-ink-400 hover:text-primary transition-colors"
        >
          라운드 상세 보기 →
        </Link>
      </div>
    </div>
  )
}
