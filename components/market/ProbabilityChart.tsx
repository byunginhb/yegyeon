'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

export interface ChartPoint {
  t: number   // Unix ms timestamp
  p: number   // probability 0-100
}

export type RangeKey = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL'

export const RANGE_MS: Record<RangeKey, number | null> = {
  '1H': 60 * 60 * 1000,
  '6H': 6 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  'ALL': null,
}

export const RANGE_LABELS: RangeKey[] = ['1H', '6H', '1D', '1W', '1M', 'ALL']

interface ProbabilityChartProps {
  data: ChartPoint[]
  currentProb: number  // 0-100
  range?: RangeKey
  height?: number
}

function formatTick(ts: number, range: RangeKey): string {
  const d = new Date(ts)
  if (range === '1H' || range === '6H' || range === '1D') {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label, range }: {
  active?: boolean
  payload?: { value: number }[]
  label?: number
  range: RangeKey
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-canvas-0 border border-ink-200 rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-ink-500 text-xs mb-1">
        {label ? formatTick(label, range) : ''}
      </p>
      <p className="font-bold text-teal-500 tabular-nums">
        {Math.round(payload[0].value)}% YES
      </p>
    </div>
  )
}

export default function ProbabilityChart({
  data,
  currentProb,
  range = 'ALL',
  height = 260,
}: ProbabilityChartProps) {
  const filteredData = useMemo<ChartPoint[]>(() => {
    const base: ChartPoint[] =
      data.length >= 2
        ? data
        : [
            { t: Date.now() - 7 * 24 * 60 * 60 * 1000, p: 50 },
            { t: Date.now(), p: currentProb },
          ]
    const ms = RANGE_MS[range]
    if (!ms) return base
    const cutoff = Date.now() - ms
    const filtered = base.filter((d) => d.t >= cutoff)
    if (filtered.length < 2) return base.slice(-2)
    return filtered
  }, [data, currentProb, range])

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filteredData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="currentColor"
            strokeDasharray="0"
            strokeOpacity={0.08}
            vertical={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t) => formatTick(t, range)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={120}
          />
          <YAxis
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip range={range} />} />
          <ReferenceLine y={50} stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.2} />
          <Area
            type="stepAfter"
            dataKey="p"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#probGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
