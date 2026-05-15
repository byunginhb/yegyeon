'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PointsDisplay from '@/components/ui/PointsDisplay'
import PointIcon from '@/components/ui/PointIcon'
import type { Market, MarketOption } from '@/types'
import {
  calcExpectedPayoutBinary,
  calcExpectedPayoutOption,
} from '@/lib/market-math'

interface BettingPanelProps {
  market: Market & { options?: MarketOption[] }
  userPoints: number | null
  isLoggedIn: boolean
  onBetSuccess?: (newProbability: number) => void
}

const QUICK_AMOUNTS = [10, 50, 100, 500]

export default function BettingPanel({
  market,
  userPoints,
  isLoggedIn,
  onBetSuccess,
}: BettingPanelProps) {
  const router = useRouter()
  const [selectedOutcome, setSelectedOutcome] = useState<string>(
    market.type === 'binary' ? 'YES' : ''
  )
  const [amount, setAmount] = useState<number>(100)
  const [inputValue, setInputValue] = useState('100')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localPoints, setLocalPoints] = useState(userPoints ?? 0)

  useEffect(() => {
    setLocalPoints(userPoints ?? 0)
  }, [userPoints])

  const currentProb = market.yes_probability ?? 0.5

  // 예상 수치 계산 — parimutuel 통일 (서버 정산과 일치)
  const calcPreview = useCallback(() => {
    if (!selectedOutcome || amount <= 0) {
      return { shares: 0, payout: 0, newProb: currentProb, multiplier: 0 }
    }

    if (market.type === 'binary') {
      const outcome = selectedOutcome as 'YES' | 'NO'
      const yesPool = market.yes_amount ?? 0
      const noPool = market.no_amount ?? 0
      const payout = calcExpectedPayoutBinary(amount, outcome, yesPool, noPool)
      // 새 확률 = 새 yes_amount / 새 total
      const newYes = outcome === 'YES' ? yesPool + amount : yesPool
      const newNo = outcome === 'NO' ? noPool + amount : noPool
      const total = newYes + newNo
      const newProb = total > 0 ? Math.max(0.01, Math.min(0.99, newYes / total)) : currentProb
      const multiplier = amount > 0 ? payout / amount : 0
      return { shares: amount, payout, newProb, multiplier }
    }

    if (market.type === 'multiple_choice' && market.options) {
      const opt = market.options.find((o) => o.id === selectedOutcome)
      const optionPool = opt?.total_amount ?? 0
      const totalPool = market.options.reduce((s, o) => s + (o.total_amount ?? 0), 0)
      const payout = calcExpectedPayoutOption(amount, optionPool, totalPool)
      const multiplier = amount > 0 ? payout / amount : 0
      return { shares: amount, payout, newProb: currentProb, multiplier }
    }

    return {
      shares: amount,
      payout: amount,
      newProb: currentProb,
      multiplier: 1,
    }
  }, [selectedOutcome, amount, currentProb, market.type, market.yes_amount, market.no_amount, market.options])

  const preview = calcPreview()

  function handleAmountInput(value: string) {
    setInputValue(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed)
    }
  }

  function handleQuickAmount(add: number) {
    const next = Math.max(10, amount + add)
    setAmount(next)
    setInputValue(String(next))
  }

  async function handleSubmit() {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }
    if (!selectedOutcome) {
      toast.error('베팅할 항목을 선택해주세요.')
      return
    }
    if (amount < 10) {
      toast.error('최소 베팅 금액은 10포인트입니다.')
      return
    }
    if (localPoints < amount) {
      toast.error(`포인트가 부족합니다. 현재 보유: ${localPoints.toLocaleString()}포인트`)
      return
    }

    setIsSubmitting(true)

    try {
      const isOption = market.type === 'multiple_choice'
      const selectedOption = isOption ? market.options?.find(o => o.id === selectedOutcome) : null
      const outcomeText = isOption ? (selectedOption?.text ?? selectedOutcome) : selectedOutcome
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          outcome: outcomeText,
          option_id: isOption ? selectedOutcome : null,
          amount,
        }),
      })

      const json = await res.json()

      if (!json.success) {
        toast.error(json.error ?? '베팅에 실패했습니다.')
        return
      }

      if (typeof json.data.new_balance === 'number') {
        setLocalPoints(json.data.new_balance)
      } else {
        setLocalPoints((prev) => prev - amount)
      }
      onBetSuccess?.(json.data.new_probability)

      toast.success(
        `${outcomeText}에 ${amount.toLocaleString()}포인트 베팅 완료`
      )

      // 금액 초기화
      setAmount(100)
      setInputValue('100')
    } catch {
      toast.error('서버 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6">
        <h3 className="text-base font-semibold text-ink-1000 mb-4">베팅하기</h3>
        <p className="text-sm text-ink-600 mb-4">
          이 마켓에 베팅하려면 로그인이 필요합니다.
        </p>
        <Button
          className="w-full"
          onClick={() => router.push('/auth/login')}
        >
          로그인 후 베팅하기
        </Button>
      </div>
    )
  }

  if (market.status !== 'open') {
    return (
      <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6">
        <h3 className="text-base font-semibold text-ink-1000 mb-2">베팅하기</h3>
        <p className="text-sm text-ink-500">이 마켓은 현재 베팅이 마감되었습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-ink-1000">베팅하기</h3>
        <span className="text-sm text-ink-500">
          보유: <PointsDisplay amount={localPoints} size="sm" className="font-semibold text-ink-800" />
        </span>
      </div>

      {/* Binary: YES/NO 탭 */}
      {market.type === 'binary' && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedOutcome('YES')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedOutcome === 'YES'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20'
            }`}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => setSelectedOutcome('NO')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedOutcome === 'NO'
                ? 'bg-scarlet-500 text-white shadow-sm'
                : 'bg-scarlet-500/10 text-scarlet-600 hover:bg-scarlet-500/20'
            }`}
          >
            NO
          </button>
        </div>
      )}

      {/* Multiple Choice: 옵션 버튼 */}
      {market.type === 'multiple_choice' && market.options && (
        <div className="flex flex-col gap-2 mb-4">
          {[...market.options]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOutcome(opt.id)}
                className={`w-full py-2 px-3 rounded-xl text-sm font-medium text-left transition-all flex items-center gap-2.5 ${
                  selectedOutcome === opt.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-canvas-100 text-ink-800 hover:bg-canvas-50 border border-ink-200'
                }`}
              >
                <span className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-canvas-0/40 border border-black/5 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={opt.image_url ?? '/logo.png'}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="flex-1 truncate">{opt.text}</span>
                <span className="text-xs opacity-80 tabular-nums">
                  {Math.round(opt.probability * 100)}%
                </span>
              </button>
            ))}
        </div>
      )}

      {/* 금액 입력 */}
      <div className="mb-3">
        <label className="text-xs text-ink-500 mb-1.5 flex items-center gap-0.5">베팅 금액 <PointIcon size={11} /></label>
        <Input
          type="number"
          min={10}
          value={inputValue}
          onChange={(e) => handleAmountInput(e.target.value)}
          className="text-base font-semibold"
          placeholder="10 이상 입력"
        />
      </div>

      {/* 빠른 금액 버튼 */}
      <div className="flex gap-2 mb-4">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleQuickAmount(q)}
            className="flex-1 text-xs py-1.5 rounded-lg bg-canvas-100 text-ink-600 hover:bg-canvas-50 border border-ink-200 transition-colors"
          >
            +{q}
          </button>
        ))}
      </div>

      {/* 실시간 계산 표시 */}
      {selectedOutcome && amount >= 10 && (
        <div className="bg-canvas-100 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">예상 수익</span>
            <span className="font-semibold text-ink-900">
              <PointsDisplay amount={Math.round(preview.payout)} size="sm" />
              <span className="text-ink-400 font-normal ml-1">
                ({preview.multiplier.toFixed(2)}배)
              </span>
            </span>
          </div>
          {market.type === 'binary' && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">새 확률 (YES)</span>
              <span className="font-semibold text-ink-900">
                {Math.round(preview.newProb * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 확인 버튼 */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitting || !selectedOutcome || amount < 10}
      >
        {isSubmitting
          ? '처리 중...'
          : selectedOutcome
            ? `${market.type === 'multiple_choice' ? (market.options?.find(o => o.id === selectedOutcome)?.text ?? selectedOutcome) : selectedOutcome}에 ${amount.toLocaleString()}포인트 베팅`
            : '항목을 선택해주세요'}
      </Button>
    </div>
  )
}
