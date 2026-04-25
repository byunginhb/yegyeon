'use client'

import { useState } from 'react'
import BettingPanel from './BettingPanel'
import MarketProbabilityChart from './MarketProbabilityChart'
import type { Market, MarketOption } from '@/types'

interface BettingPanelWrapperProps {
  market: Market & { options?: MarketOption[] }
  userPoints: number | null
  isLoggedIn: boolean
}

export default function BettingPanelWrapper({
  market,
  userPoints,
  isLoggedIn,
}: BettingPanelWrapperProps) {
  const [currentProbability, setCurrentProbability] = useState<number>(
    market.yes_probability ?? 0.5
  )

  return (
    <>
      <div className="bg-canvas-0 rounded-2xl border border-ink-200 p-6 mb-4">
        <MarketProbabilityChart
          market={market}
          currentProbability={market.type === 'binary' ? currentProbability : undefined}
        />
      </div>
      <BettingPanel
        market={market}
        userPoints={userPoints}
        isLoggedIn={isLoggedIn}
        onBetSuccess={(newProb) => setCurrentProbability(newProb)}
      />
    </>
  )
}
