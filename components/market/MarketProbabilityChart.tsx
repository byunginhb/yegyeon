'use client'

import type { Market, MarketOption } from '@/types'

interface MarketProbabilityChartProps {
  market: Market & { options?: MarketOption[] }
  currentProbability?: number  // optimistic update 시 외부에서 주입
}

export default function MarketProbabilityChart({
  market,
  currentProbability,
}: MarketProbabilityChartProps) {
  const yesProb = currentProbability ?? market.yes_probability ?? 0.5
  const yesPercent = Math.round(yesProb * 100)
  const noPercent = 100 - yesPercent

  if (market.type === 'binary') {
    return (
      <div className="text-center">
        <p className="text-sm text-ink-500 mb-1">YES 확률</p>
        <p className="text-6xl font-bold text-teal-500 mb-1 tabular-nums transition-all">
          {yesPercent}%
        </p>
        <p className="text-sm text-ink-500 mb-4">
          NO {noPercent}%
        </p>
        {/* 확률 바 */}
        <div className="h-3 rounded-full overflow-hidden bg-scarlet-500/20 flex">
          <div
            className="bg-teal-500 h-full transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div className="bg-scarlet-500 h-full flex-1" />
        </div>
        <div className="flex justify-between text-xs text-ink-400 mt-1">
          <span className="text-teal-600 font-medium">YES</span>
          <span className="text-scarlet-600 font-medium">NO</span>
        </div>
      </div>
    )
  }

  if (market.type === 'multiple_choice' && market.options) {
    const sorted = [...market.options].sort((a, b) => b.probability - a.probability)
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-500 font-medium">현재 예측</p>
        {sorted.map((opt) => {
          const pct = Math.round(opt.probability * 100)
          return (
            <div key={opt.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink-800 font-medium">{opt.text}</span>
                <span className="text-ink-600 tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-ink-200 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (market.type === 'numeric') {
    return (
      <div className="text-center">
        <p className="text-sm text-ink-500 mb-1">예측 범위</p>
        <p className="text-3xl font-bold text-ink-1000">
          {market.min_value?.toLocaleString()} ~ {market.max_value?.toLocaleString()}
          {market.unit && (
            <span className="text-xl ml-1 text-ink-600">{market.unit}</span>
          )}
        </p>
      </div>
    )
  }

  return null
}
