'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import PointIcon from '@/components/ui/PointIcon'
import PointsDisplay from '@/components/ui/PointsDisplay'
import ProbabilityChart, {
  type ChartPoint,
  type RangeKey,
  RANGE_LABELS,
} from '@/components/market/ProbabilityChart'
import type { Market, MarketOption } from '@/types'
import {
  calcExpectedPayoutBinary,
  calcExpectedPayoutOption,
} from '@/lib/market-math'

interface Props {
  market: Market & { options?: MarketOption[] }
  userPoints: number | null
  isLoggedIn: boolean
  chartData?: ChartPoint[]
}

const QUICK_AMOUNTS = [10, 50, 100, 500]

export default function InlineMarketBetting({ market, userPoints, isLoggedIn, chartData }: Props) {
  const router = useRouter()
  const [currentProb, setCurrentProb] = useState(market.yes_probability ?? 0.5)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [amount, setAmount] = useState(100)
  const [inputValue, setInputValue] = useState('100')
  const [localPoints, setLocalPoints] = useState(userPoints ?? 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [range, setRange] = useState<RangeKey>('ALL')

  useEffect(() => {
    setLocalPoints(userPoints ?? 0)
  }, [userPoints])

  const yesPercent = Math.round(currentProb * 100)
  const noPercent = 100 - yesPercent
  const isOpen = market.status === 'open'

  // 최근 변화량 표시용 (마지막 베팅 대비 delta)
  const deltaPercent = (() => {
    if (!chartData || chartData.length < 2) return 0
    const first = chartData[0].p
    const last = chartData[chartData.length - 1].p
    return last - first
  })()

  const preview = useCallback(() => {
    if (!selectedOutcome || amount <= 0) {
      return { payout: 0, newProb: currentProb, multiplier: 0 }
    }
    if (market.type === 'binary') {
      const outcome = selectedOutcome as 'YES' | 'NO'
      const yesPool = market.yes_amount ?? 0
      const noPool = market.no_amount ?? 0
      const payout = calcExpectedPayoutBinary(amount, outcome, yesPool, noPool)
      const newYes = outcome === 'YES' ? yesPool + amount : yesPool
      const newNo = outcome === 'NO' ? noPool + amount : noPool
      const total = newYes + newNo
      const newProb = total > 0 ? Math.max(0.01, Math.min(0.99, newYes / total)) : currentProb
      return { payout, newProb, multiplier: amount > 0 ? payout / amount : 0 }
    }
    if (market.type === 'multiple_choice' && market.options) {
      const opt = market.options.find((o) => o.id === selectedOutcome)
      const optionPool = opt?.total_amount ?? 0
      const totalPool = market.options.reduce((s, o) => s + (o.total_amount ?? 0), 0)
      const payout = calcExpectedPayoutOption(amount, optionPool, totalPool)
      return { payout, newProb: currentProb, multiplier: amount > 0 ? payout / amount : 0 }
    }
    return { payout: amount, newProb: currentProb, multiplier: 1 }
  }, [selectedOutcome, amount, currentProb, market.type, market.yes_amount, market.no_amount, market.options])

  const p = preview()

  function handleOutcomeClick(outcome: string) {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }
    setSelectedOutcome((prev) => (prev === outcome ? null : outcome))
  }

  function handleAmountInput(value: string) {
    setInputValue(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed)
  }

  function handleQuickAmount(add: number) {
    const next = Math.max(10, amount + add)
    setAmount(next)
    setInputValue(String(next))
  }

  async function handleSubmit() {
    if (!selectedOutcome || amount < 10) return
    if (localPoints < amount) {
      toast.error(`포인트 부족. 현재 ${localPoints.toLocaleString()}포인트`)
      return
    }
    setIsSubmitting(true)
    try {
      const isOption = market.type === 'multiple_choice'
      const selectedOption = isOption ? market.options?.find(o => o.id === selectedOutcome) : null
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          outcome: isOption ? (selectedOption?.text ?? selectedOutcome) : selectedOutcome,
          option_id: isOption ? selectedOutcome : null,
          amount,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error ?? '베팅 실패')
        return
      }
      if (typeof json.data.new_balance === 'number') {
        setLocalPoints(json.data.new_balance)
      } else {
        setLocalPoints((prev) => prev - amount)
      }
      if (json.data.new_probability) setCurrentProb(json.data.new_probability)
      const outcomeLabel = selectedOption?.text ?? selectedOutcome
      toast.success(
        `${outcomeLabel}에 ${amount.toLocaleString()}포인트 베팅 완료`
      )
      setSelectedOutcome(null)
      setAmount(100)
      setInputValue('100')
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Binary ──────────────────────────────────── */
  if (market.type === 'binary') {
    return (
      <div className="mb-6">
        {/* 확률 숫자 + 기간 필터 (모바일 세로, 데스크탑 한 행) */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-3">
          <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
            <span className="text-5xl font-extrabold text-teal-500 tabular-nums leading-none">
              {yesPercent}%
            </span>
            <span className="text-base text-ink-500 font-medium">chance</span>
            {deltaPercent !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-sm font-semibold tabular-nums ${
                  deltaPercent > 0 ? 'text-teal-500' : 'text-scarlet-500'
                }`}
              >
                {deltaPercent > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(deltaPercent)}
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-0.5 rounded-lg border border-ink-200 bg-canvas-0 p-0.5 self-start sm:self-auto overflow-x-auto">
            {RANGE_LABELS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0 ${
                  range === r
                    ? 'bg-teal-500 text-white'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 확률 히스토리 차트 (크게) */}
        <ProbabilityChart
          data={chartData ?? []}
          currentProb={yesPercent}
          range={range}
          height={260}
        />

        {/* 베팅 버튼 */}
        {isOpen && (
          <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            <button
              onClick={() => handleOutcomeClick('YES')}
              className={`py-4 rounded-xl text-base font-bold transition-all ${
                selectedOutcome === 'YES'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              베팅 YES ↑
            </button>
            <button
              onClick={() => handleOutcomeClick('NO')}
              className={`py-4 rounded-xl text-base font-bold transition-all ${
                selectedOutcome === 'NO'
                  ? 'bg-scarlet-500 text-white shadow-md'
                  : 'bg-scarlet-500 text-white hover:bg-scarlet-600'
              }`}
            >
              베팅 NO ↓
            </button>
          </div>
        )}

        {/* 인라인 베팅 폼 */}
        {selectedOutcome && isLoggedIn && isOpen && (
          <div className="bg-canvas-50 border border-ink-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-800">
                <span
                  className={selectedOutcome === 'YES' ? 'text-teal-600' : 'text-scarlet-600'}
                >
                  {selectedOutcome}
                </span>에 베팅
              </span>
              <span className="text-ink-500">
                보유: <PointsDisplay amount={localPoints} size="sm" />
              </span>
            </div>

            {/* 금액 입력 */}
            <div>
              <label className="text-xs text-ink-500 mb-1 flex items-center gap-0.5">
                금액 <PointIcon size={10} />
              </label>
              <Input
                type="number"
                min={10}
                value={inputValue}
                onChange={(e) => handleAmountInput(e.target.value)}
                className="text-base font-semibold"
                placeholder="10 이상 입력"
              />
            </div>

            {/* 빠른 금액 */}
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickAmount(q)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-canvas-100 text-ink-600 hover:bg-canvas-0 border border-ink-200 transition-colors"
                >
                  +{q}
                </button>
              ))}
            </div>

            {/* 예상 수익 */}
            {amount >= 10 && (
              <div className="bg-canvas-0 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">예상 수익</span>
                  <span className="font-semibold text-ink-900">
                    <PointsDisplay amount={Math.round(p.payout)} size="sm" />
                    <span className="text-ink-400 text-xs ml-1">({p.multiplier.toFixed(2)}배)</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">베팅 후 YES 확률</span>
                  <span className="font-semibold text-ink-900">
                    {Math.round(p.newProb * 100)}%
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || amount < 10}
            >
              {isSubmitting
                ? '처리 중...'
                : `${selectedOutcome}에 ${amount.toLocaleString()}포인트 베팅`}
            </Button>
          </div>
        )}

        {/* 비로그인 안내 */}
        {!isLoggedIn && isOpen && (
          <p className="text-sm text-ink-500 mt-1">
            베팅하려면{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-primary hover:underline font-medium"
            >
              로그인
            </button>
            이 필요합니다.
          </p>
        )}

        {!isOpen && (
          <p className="text-sm text-ink-400 mt-1">이 마켓은 베팅이 마감되었습니다.</p>
        )}

        {/* NO 확률 힌트 */}
        <p className="text-xs text-ink-400 mt-2">NO {noPercent}%</p>
      </div>
    )
  }

  /* ── Multiple Choice ────────────────────────── */
  if (market.type === 'multiple_choice' && market.options) {
    const sorted = [...market.options].sort((a, b) => b.probability - a.probability)
    return (
      <div className="mb-6 space-y-3">
        {sorted.map((opt) => {
          const pct = Math.round(opt.probability * 100)
          const isSelected = selectedOutcome === opt.id
          return (
            <div key={opt.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-ink-800">{opt.text}</span>
                <span className="text-ink-600 tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-ink-200 overflow-hidden mb-1.5">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {isOpen && (
                <button
                  onClick={() => handleOutcomeClick(opt.id)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-canvas-100 text-ink-700 hover:bg-canvas-50 border border-ink-200'
                  }`}
                >
                  {opt.text} 베팅
                </button>
              )}
            </div>
          )
        })}

        {selectedOutcome && isLoggedIn && isOpen && (
          <div className="bg-canvas-50 border border-ink-200 rounded-xl p-4 space-y-3 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-800">
                <span className="text-primary">{market.options?.find(o => o.id === selectedOutcome)?.text ?? selectedOutcome}</span> 베팅
              </span>
              <span className="text-ink-500">
                보유: <PointsDisplay amount={localPoints} size="sm" />
              </span>
            </div>
            <Input
              type="number"
              min={10}
              value={inputValue}
              onChange={(e) => handleAmountInput(e.target.value)}
              className="text-base font-semibold"
            />
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuickAmount(q)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-canvas-100 text-ink-600 hover:bg-canvas-0 border border-ink-200"
                >
                  +{q}
                </button>
              ))}
            </div>
            {amount >= 10 && (
              <div className="bg-canvas-0 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">예상 수익</span>
                  <span className="font-semibold text-ink-900">
                    <PointsDisplay amount={Math.round(p.payout)} size="sm" />
                    <span className="text-ink-400 text-xs ml-1">({p.multiplier.toFixed(2)}배)</span>
                  </span>
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || amount < 10}>
              {isSubmitting ? '처리 중...' : `${amount.toLocaleString()}포인트 베팅`}
            </Button>
          </div>
        )}
      </div>
    )
  }

  /* ── Numeric ─────────────────────────────────── */
  if (market.type === 'numeric') {
    return (
      <div className="mb-6">
        <div className="bg-canvas-50 rounded-xl border border-ink-200 p-5 text-center">
          <p className="text-sm text-ink-500 mb-2">예측 범위</p>
          <p className="text-3xl font-bold text-ink-1000">
            {market.min_value?.toLocaleString()} ~ {market.max_value?.toLocaleString()}
            {market.unit && <span className="text-xl ml-1 text-ink-600">{market.unit}</span>}
          </p>
        </div>
      </div>
    )
  }

  return null
}
