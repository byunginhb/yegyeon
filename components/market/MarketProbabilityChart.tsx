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
    const hasAnyImage = sorted.some((o) => !!o.image_url)
    return (
      <div>
        <p className="text-sm text-ink-500 font-medium mb-2">현재 예측</p>
        <div className="divide-y divide-ink-200">
          {sorted.map((opt) => {
            const pct = Math.round(opt.probability * 100)
            return (
              <div key={opt.id} className="flex items-center gap-3 py-3">
                {hasAnyImage && (
                  <span className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-canvas-100 border border-ink-200/60 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={opt.image_url ?? '/logo.png'}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{opt.text}</p>
                </div>
                <div className="shrink-0 text-2xl font-bold text-ink-900 tabular-nums w-14 text-right">
                  {pct}%
                </div>
              </div>
            )
          })}
        </div>
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
