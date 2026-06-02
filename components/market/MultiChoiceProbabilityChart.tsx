'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import {
  type RangeKey,
  RANGE_MS,
  RANGE_LABELS,
} from '@/components/market/ProbabilityChart'

export interface ChartSeries {
  optionId: string
  label: string
  color: string
  imageUrl: string | null
  points: { t: number; p: number }[]  // p: 0~100
  isOther?: boolean
}

interface MultiChoiceProbabilityChartProps {
  series: ChartSeries[]
  range?: RangeKey
  height?: number
}

const OTHER_COLOR = '#9ca3af'

function formatTick(ts: number, range: RangeKey): string {
  const d = new Date(ts)
  if (range === '1H' || range === '6H' || range === '1D') {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

interface RechartsRow {
  t: number
  [optionId: string]: number
}

/**
 * 모든 시계열의 t 값을 union 후, 각 시점에서 옵션별 forward-fill 값 채움.
 */
function buildRechartsData(series: ChartSeries[]): RechartsRow[] {
  if (series.length === 0) return []

  const tSet = new Set<number>()
  for (const s of series) {
    for (const p of s.points) tSet.add(p.t)
  }
  const tList = Array.from(tSet).sort((a, b) => a - b)

  // 각 series별 정렬된 points
  const sortedPoints: Record<string, { t: number; p: number }[]> = {}
  for (const s of series) {
    sortedPoints[s.optionId] = [...s.points].sort((a, b) => a.t - b.t)
  }

  // 옵션별 forward-fill 포인터
  const cursors: Record<string, number> = {}
  const lastValues: Record<string, number> = {}
  for (const s of series) {
    cursors[s.optionId] = 0
    lastValues[s.optionId] = s.points.length > 0 ? s.points[0].p : 0
  }

  const rows: RechartsRow[] = []
  for (const t of tList) {
    const row: RechartsRow = { t }
    for (const s of series) {
      const pts = sortedPoints[s.optionId]
      while (cursors[s.optionId] < pts.length && pts[cursors[s.optionId]].t <= t) {
        lastValues[s.optionId] = pts[cursors[s.optionId]].p
        cursors[s.optionId] += 1
      }
      row[s.optionId] = lastValues[s.optionId]
    }
    rows.push(row)
  }
  return rows
}

function CustomTooltip({
  active,
  payload,
  label,
  range,
  seriesMap,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: number
  range: RangeKey
  seriesMap: Record<string, ChartSeries>
}) {
  if (!active || !payload?.length) return null

  const rows = payload
    .map((p) => {
      const s = seriesMap[p.dataKey]
      if (!s) return null
      return { series: s, value: p.value }
    })
    .filter((r): r is { series: ChartSeries; value: number } => r !== null)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-canvas-0 border border-ink-200 rounded-lg px-3 py-2 text-xs shadow-lg min-w-[180px]">
      <p className="text-ink-500 mb-1.5">
        {label ? formatTick(label, range) : ''}
      </p>
      <ul className="space-y-1">
        {rows.map(({ series, value }) => (
          <li key={series.optionId} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: series.color }}
            />
            {series.imageUrl && !series.isOther && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={series.imageUrl}
                alt=""
                className="h-4 w-4 rounded-full object-cover shrink-0"
              />
            )}
            <span
              className={`flex-1 truncate ${
                series.isOther ? 'text-ink-500' : 'text-ink-800'
              }`}
            >
              {series.label}
            </span>
            <span className="font-semibold tabular-nums text-ink-900">
              {Math.round(value)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MultiChoiceProbabilityChart({
  series,
  range: initialRange = 'ALL',
  height = 280,
}: MultiChoiceProbabilityChartProps) {
  const [range, setRange] = useState<RangeKey>(initialRange)

  const seriesMap = useMemo(() => {
    const m: Record<string, ChartSeries> = {}
    for (const s of series) m[s.optionId] = s
    return m
  }, [series])

  const filteredSeries = useMemo<ChartSeries[]>(() => {
    const ms = RANGE_MS[range]
    if (!ms) return series
    const cutoff = Date.now() - ms
    return series.map((s) => {
      const within = s.points.filter((p) => p.t >= cutoff)
      // 컷오프 이전의 마지막 값을 시작점으로 보존 (forward-fill 시작값)
      const beforeCutoff = s.points.filter((p) => p.t < cutoff)
      const seed =
        beforeCutoff.length > 0
          ? [{ t: cutoff, p: beforeCutoff[beforeCutoff.length - 1].p }]
          : []
      const merged = [...seed, ...within]
      return {
        ...s,
        points: merged.length >= 2 ? merged : s.points.slice(-2),
      }
    })
  }, [series, range])

  const chartData = useMemo(() => buildRechartsData(filteredSeries), [filteredSeries])

  // 현재 값 라벨 (마지막 시점 기준)
  const lastRow = chartData[chartData.length - 1]
  const currentValues: { series: ChartSeries; value: number }[] = lastRow
    ? filteredSeries
        .map((s) => ({ series: s, value: lastRow[s.optionId] ?? 0 }))
        .sort((a, b) => b.value - a.value)
    : []

  return (
    <div className="w-full">
      {/* 헤더: 범위 필터 + 상단 후보 요약 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {currentValues.slice(0, 4).map(({ series: s, value }) => (
            <div key={s.optionId} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              <span
                className={`max-w-[120px] truncate ${
                  s.isOther ? 'text-ink-500' : 'text-ink-700'
                }`}
              >
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-ink-900">
                {Math.round(value)}%
              </span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-ink-200 bg-canvas-0 p-0.5 self-start sm:self-auto overflow-x-auto">
          {RANGE_LABELS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0 ${
                range === r
                  ? 'bg-primary text-white'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
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
            <Tooltip
              content={
                <CustomTooltip range={range} seriesMap={seriesMap} />
              }
            />
            <ReferenceLine y={50} stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.2} />
            {filteredSeries.map((s) => (
              <Line
                key={s.optionId}
                type="stepAfter"
                dataKey={s.optionId}
                stroke={s.isOther ? OTHER_COLOR : s.color}
                strokeWidth={2}
                strokeDasharray={s.isOther ? '4 4' : undefined}
                dot={false}
                activeDot={{ r: 4, stroke: 'white', strokeWidth: 2, fill: s.isOther ? OTHER_COLOR : s.color }}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
