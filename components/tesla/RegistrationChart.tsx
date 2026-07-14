'use client'

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts'
import { Database, ExternalLink } from 'lucide-react'
import type {
  TeslaAnnualRegistration,
  TeslaTrimRegistration,
  TeslaVehicleCard,
} from '@/types/tesla'
import { formatCount, formatRegistrationPeriod } from './tesla-utils'
import styles from './TeslaHoguPage.module.css'

interface RegistrationChartProps {
  registrations: TeslaAnnualRegistration[]
  trimRegistrations: TeslaTrimRegistration[]
  selected: TeslaVehicleCard
  activeModel: string
  years: number[]
}

interface RegistrationChartPoint {
  year: number
  model3?: number
  model3Scope?: string
  modelY?: number
  modelYScope?: string
  curve?: number
}

function RegistrationTooltip({
  active,
  payload,
  label,
  activeModel,
}: TooltipContentProps & { activeModel: string }) {
  if (!active || !payload.length) return null
  const point = payload[0]?.payload as RegistrationChartPoint | undefined
  if (!point) return null

  const rows = [
    { model: 'Model 3', count: point.model3, scope: point.model3Scope },
    { model: 'Model Y', count: point.modelY, scope: point.modelYScope },
  ].filter((row) => row.count !== undefined && (activeModel === 'all' || row.model === activeModel))

  return (
    <div className="min-w-48 rounded-xl border border-white/15 bg-[#111317] p-3 shadow-2xl">
      <p className="mb-2 text-xs font-black text-white">{label}년</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.model}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-bold text-zinc-300">{row.model}</span>
              <span className="font-mono font-black text-white">{formatCount(row.count!)}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-zinc-500">{row.scope}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegistrationChart({
  registrations,
  trimRegistrations,
  selected,
  activeModel,
  years,
}: RegistrationChartProps) {
  const chartData = years.map((year) => {
    const model3Registration = registrations.find(
      (item) => item.year === year && item.model === 'Model 3'
    )
    const modelYRegistration = registrations.find(
      (item) => item.year === year && item.model === 'Model Y'
    )
    const model3 = model3Registration?.count
    const modelY = modelYRegistration?.count

    const curve =
      activeModel === 'Model 3'
        ? model3
        : activeModel === 'Model Y'
          ? modelY
          : model3 === undefined && modelY === undefined
            ? undefined
            : (model3 ?? 0) + (modelY ?? 0)

    return {
      year,
      model3,
      model3Scope: model3Registration?.scope,
      modelY,
      modelYScope: modelYRegistration?.scope,
      curve,
    }
  })

  const visibleTrimData = trimRegistrations.filter(
    (item) => activeModel === 'all' || item.model === activeModel
  )

  return (
    <section id="registrations" className={`${styles.panel} overflow-hidden`}>
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={styles.sectionNumber}>02 / REGISTRATION CURVE</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
              국내 등록·판매 분포
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              공개된 연간 신규등록 수치와 판매·등록 대리값을 원문 범위 그대로 함께 표시합니다.
              곡선은 흐름만 부드럽게 연결하며 정규분포로 보정하지 않습니다.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-300">
            <Database className="h-3.5 w-3.5 text-red-400" />
            선택 {selected.year} · {selected.model}
          </div>
        </div>
      </div>

      <div className="px-2 py-5 sm:px-5">
        <div className="h-[350px] w-full" aria-label="연도별 Tesla 국내 신규등록대수 차트">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData} margin={{ top: 18, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#9ba0aa', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ba0aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                content={(props) => <RegistrationTooltip {...props} activeModel={activeModel} />}
              />
              <Legend
                wrapperStyle={{ color: '#d4d4d8', fontSize: 12, paddingTop: 10 }}
              />
              {(activeModel === 'all' || activeModel === 'Model 3') && (
                <Bar dataKey="model3" name="Model 3" fill="#e82127" radius={[4, 4, 0, 0]}>
                  {chartData.map((item) => (
                    <Cell
                      key={`m3-${item.year}`}
                      fill={
                        item.year === selected.year && selected.model === 'Model 3'
                          ? '#ff7478'
                          : '#e82127'
                      }
                      opacity={item.year === selected.year ? 1 : 0.68}
                    />
                  ))}
                </Bar>
              )}
              {(activeModel === 'all' || activeModel === 'Model Y') && (
                <Bar dataKey="modelY" name="Model Y" fill="#d4d4d8" radius={[4, 4, 0, 0]}>
                  {chartData.map((item) => (
                    <Cell
                      key={`my-${item.year}`}
                      fill={
                        item.year === selected.year && selected.model === 'Model Y'
                          ? '#ffffff'
                          : '#a1a1aa'
                      }
                      opacity={item.year === selected.year ? 1 : 0.58}
                    />
                  ))}
                </Bar>
              )}
              <Line
                type="monotone"
                dataKey="curve"
                name="분포 흐름"
                stroke="#ff4b50"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 5, fill: '#fff', stroke: '#e82127', strokeWidth: 3 }}
              />
              <ReferenceLine
                x={selected.year}
                stroke="rgba(255,255,255,0.5)"
                strokeDasharray="4 6"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mx-3 mt-2 rounded-xl border border-amber-400/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/75">
          2026년은 연간 모델 전체 집계가 없어 막대를 표시하지 않습니다. 아래 일부 트림 수치는
          별도 기간 누계이며 연간치에 합산하지 않았습니다.
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 sm:px-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-zinc-200">
            공식 확인된 트림 수치만
          </h3>
          <span className="text-xs text-zinc-500">추정 배분 없음</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {visibleTrimData.map((item) => {
            const isSelected =
              item.model === selected.model &&
              item.trim === selected.trim &&
              item.period.startsWith(String(selected.year))
            return (
              <a
                key={`${item.period}-${item.model}-${item.trim}`}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-red-500/70 bg-red-500/10'
                    : 'border-white/10 bg-white/[0.025] hover:border-white/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-zinc-400">{formatRegistrationPeriod(item.period)}</p>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                </div>
                <p className="mt-1 text-sm font-bold text-white">{item.model} · {item.trim}</p>
                <p className="mt-2 font-mono text-xl font-black tabular-nums text-red-400">
                  {formatCount(item.count)}
                </p>
                {item.note && <p className="mt-2 text-[11px] leading-4 text-zinc-500">{item.note}</p>}
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
