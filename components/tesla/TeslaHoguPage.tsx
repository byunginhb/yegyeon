'use client'

import dynamic from 'next/dynamic'
import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  BatteryCharging,
  CarFront,
  ChevronRight,
  CircleHelp,
  Cpu,
  ExternalLink,
  Gauge,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type { TeslaData, TeslaGenerationSpec, TeslaVehicleCard } from '@/types/tesla'
import TeslaDetailPanel from './TeslaDetailPanel'
import VideoLab from './VideoLab'
import {
  findAnnualRegistration,
  findTrimRegistration,
  formatCount,
  formatKRW,
  formatRegistrationPeriod,
  isMixedSpec,
} from './tesla-utils'
import styles from './TeslaHoguPage.module.css'

const RegistrationChart = dynamic(() => import('./RegistrationChart'), {
  ssr: false,
  loading: () => (
    <section id="registrations" className={`${styles.panel} grid min-h-[440px] place-items-center`}>
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full border-2 border-red-500/25 border-t-red-500" />
        <p className="mt-4 text-xs font-bold text-zinc-500">등록 분포 차트를 준비하고 있습니다.</p>
      </div>
    </section>
  ),
})

type Filters = {
  model: string
  year: string
  trim: string
  origin: string
}

const ALL = 'all'

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function scoreTone(score: number): string {
  if (score >= 65) return 'text-red-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 35) return 'text-yellow-300'
  return 'text-emerald-400'
}

function getScoreBand(data: TeslaData, score: number): string {
  return data.scoreBands.find((band) => score >= band.min && score <= band.max)?.label ?? '미분류'
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#15171b] px-3 text-sm font-bold text-zinc-100 outline-none transition focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function VehicleTimelineCard({
  card,
  generation,
  data,
  selected,
  onSelect,
}: {
  card: TeslaVehicleCard
  generation: TeslaGenerationSpec
  data: TeslaData
  selected: boolean
  onSelect: () => void
}) {
  const annual = findAnnualRegistration(card, data.annualModelRegistrations)
  const trimRegistration = findTrimRegistration(card, data.knownTrimRegistrations)
  const scoreBand = getScoreBand(data, card.baseHoguScore)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${styles.vehicleCard} ${selected ? styles.selectedCard : ''} group p-4 sm:p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-red-600 px-2 py-1 font-mono text-[10px] font-black tracking-wider text-white">{card.model}</span>
            <span className="text-[11px] font-bold text-zinc-500">{generation.origin} · {generation.factory}</span>
            {isMixedSpec(generation) && <span className="rounded border border-amber-400/25 bg-amber-300/[0.06] px-1.5 py-0.5 text-[9px] font-black text-amber-300">MIX</span>}
          </div>
          <h4 className="mt-3 text-base font-black leading-5 tracking-[-0.025em] text-white group-hover:text-red-100">{card.trim}</h4>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{card.oneLine}</p>
        </div>
        <div className="shrink-0 text-right">
          <strong className={`font-mono text-3xl font-black leading-none tabular-nums ${scoreTone(card.baseHoguScore)}`}>{card.baseHoguScore}</strong>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-zinc-600">hogu index</span>
          <span className="mt-1 block text-[10px] font-bold text-zinc-400">{scoreBand}</span>
        </div>
      </div>

      <div className="my-4 h-px bg-white/[0.07]" />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><Cpu className="h-3 w-3" /> 컴퓨터·카메라</dt>
          <dd className="mt-1 font-semibold leading-4 text-zinc-300">{generation.hardware.autopilotComputer} · {generation.hardware.cameras}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><BatteryCharging className="h-3 w-3" /> 배터리</dt>
          <dd className="mt-1 line-clamp-2 font-semibold leading-4 text-zinc-300">{generation.battery}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><Gauge className="h-3 w-3" /> 센서</dt>
          <dd className="mt-1 font-semibold leading-4 text-zinc-300">USS {generation.hardware.uss} · {generation.hardware.radar}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><Sparkles className="h-3 w-3" /> 편의</dt>
          <dd className="mt-1 font-semibold leading-4 text-zinc-300">통풍 {generation.hardware.ventilatedSeats} · 후석화면 {generation.hardware.rearScreen} · 레버 {generation.hardware.stalks} · 히트펌프 {generation.hardware.heatPump}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-zinc-500">대표 판매가</span>
          <span className="font-mono text-xs font-black text-zinc-200">{formatKRW(card.representativePriceKRW)}</span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-zinc-500">{card.subsidySummary}</p>
      </div>

      <div className="mt-3 grid gap-1.5 text-[11px]">
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {annual ? `${annual.scope} · ${card.model} 전체 ${formatCount(annual.count)}` : `${card.year}년 연간 모델 전체 집계 없음`}
        </div>
        <div className="flex items-center gap-2 text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          {trimRegistration
            ? `${formatRegistrationPeriod(trimRegistration.period)} 트림 ${formatCount(trimRegistration.count)}`
            : '트림별 대수 미확인 · 임의 추정 없음'}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
        <span className="line-clamp-1 text-[11px] font-semibold text-zinc-500">FSD · {generation.fsdKorea}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition ${selected ? 'translate-x-0 text-red-400' : 'text-zinc-700 group-hover:translate-x-0.5 group-hover:text-zinc-300'}`} />
      </div>
    </button>
  )
}

export default function TeslaHoguPage({ data }: { data: TeslaData }) {
  const [filters, setFilters] = useState<Filters>({ model: ALL, year: ALL, trim: ALL, origin: ALL })
  const [selectedId, setSelectedId] = useState(() =>
    data.vehicleCards.reduce((highest, card) => card.baseHoguScore > highest.baseHoguScore ? card : highest).id
  )
  const detailRef = useRef<HTMLDivElement>(null)

  const generationById = useMemo(
    () => new Map(data.generationSpecs.map((generation) => [generation.id, generation])),
    [data.generationSpecs]
  )

  const modelOptions = unique(data.vehicleCards.map((card) => card.model))
  const originOptions = unique(
    data.vehicleCards
      .filter((card) => filters.model === ALL || card.model === filters.model)
      .map((card) => generationById.get(card.generationId)?.origin)
      .filter((value): value is string => Boolean(value))
  )
  const yearOptions = unique(
    data.vehicleCards
      .filter((card) => {
        const generation = generationById.get(card.generationId)
        return (filters.model === ALL || card.model === filters.model) &&
          (filters.origin === ALL || generation?.origin === filters.origin)
      })
      .map((card) => card.year)
  ).sort((a, b) => a - b)
  const trimOptions = unique(
    data.vehicleCards
      .filter((card) => {
        const generation = generationById.get(card.generationId)
        return (filters.model === ALL || card.model === filters.model) &&
          (filters.origin === ALL || generation?.origin === filters.origin) &&
          (filters.year === ALL || card.year === Number(filters.year))
      })
      .map((card) => card.trim)
  ).sort((a, b) => a.localeCompare(b, 'ko'))

  const filteredCards = data.vehicleCards
    .filter((card) => {
      const generation = generationById.get(card.generationId)
      return (filters.model === ALL || card.model === filters.model) &&
        (filters.year === ALL || card.year === Number(filters.year)) &&
        (filters.trim === ALL || card.trim === filters.trim) &&
        (filters.origin === ALL || generation?.origin === filters.origin)
    })
    .sort((a, b) => a.year - b.year || a.model.localeCompare(b.model) || a.trim.localeCompare(b.trim))

  const selectedCard = filteredCards.find((card) => card.id === selectedId) ?? filteredCards[0] ?? data.vehicleCards[0]
  const selectedGeneration = generationById.get(selectedCard.generationId)!
  const years = unique(data.vehicleCards.map((card) => card.year)).sort((a, b) => a - b)
  const groupedCards = filteredCards.reduce<Map<number, TeslaVehicleCard[]>>((groups, card) => {
    groups.set(card.year, [...(groups.get(card.year) ?? []), card])
    return groups
  }, new Map())

  const totalRegistrations = data.annualModelRegistrations.reduce((sum, item) => sum + item.count, 0)
  const highestScore = Math.max(...data.vehicleCards.map((card) => card.baseHoguScore))
  const selectedAnnual = findAnnualRegistration(selectedCard, data.annualModelRegistrations)

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => {
      if (key === 'model') return { model: value, year: ALL, trim: ALL, origin: ALL }
      if (key === 'origin') return { ...current, origin: value, year: ALL, trim: ALL }
      if (key === 'year') return { ...current, year: value, trim: ALL }
      return { ...current, [key]: value }
    })
  }

  function selectCard(id: string) {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 1279px)').matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  function resetFilters() {
    setFilters({ model: ALL, year: ALL, trim: ALL, origin: ALL })
  }

  return (
    <main className={styles.page}>
      <header className={styles.topRail}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-10">
          <div className="inline-flex items-center gap-3 font-black tracking-[-0.03em] text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-red-500/60 bg-red-600/10 text-xs text-red-400">T</span>
            <span>TESLA HOGU <span className="hidden font-mono text-[10px] font-bold tracking-[0.16em] text-zinc-600 sm:inline">/ KOREA ARCHIVE</span></span>
          </div>
          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-[0.12em] text-zinc-500 md:flex" aria-label="페이지 섹션">
            <a href="#timeline" className="transition hover:text-white">Timeline</a>
            <a href="#registrations" className="transition hover:text-white">Data</a>
            <a href="#videos" className="transition hover:text-white">Watch</a>
          </nav>
          <a href="#timeline" className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black transition hover:bg-red-500 hover:text-white">
            연표 보기 <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMark} aria-hidden>3/Y</div>
        <div className="mx-auto grid min-h-[560px] max-w-[1440px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.25fr_.75fr] lg:px-10">
          <div className={styles.reveal}>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-red-500" />
              <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-red-400">Korea delivery archive · 2019—2026</span>
            </div>
            <h1 className={styles.displayTitle}>테슬라<br /><span className="text-red-500">호구</span>연대표</h1>
            <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-zinc-300 sm:text-lg">어느 해, 어느 트림이 웃었고 울었을까. 한국 출시 Model 3와 Model Y의 가격·하드웨어·등록대수를 한 줄의 시간축에 올렸습니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#timeline" className="inline-flex h-12 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-500">내 연식 찾기 <CarFront className="h-4 w-4" /></a>
              <a href="#registrations" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-black text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.07]">등록 분포 <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          </div>

          <div className={`${styles.reveal} grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10`} style={{ animationDelay: '100ms' }}>
            {[
              ['YEARS', `${years[0]}–${years.at(-1)}`],
              ['TRIMS', `${data.vehicleCards.length}`],
              ['REGISTRATIONS', `${Math.round(totalRegistrations / 1000)}K+`],
              ['PEAK INDEX', `${highestScore}/100`],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#101216]/95 p-5 sm:p-7">
                <p className="font-mono text-[10px] font-black tracking-[0.16em] text-zinc-600">{label}</p>
                <p className="mt-3 font-mono text-3xl font-black tracking-[-0.06em] text-white sm:text-4xl">{value}</p>
              </div>
            ))}
            <div className="col-span-2 flex items-start gap-3 bg-red-600 p-5 text-white sm:p-6">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-xs font-bold leading-5">{data.meta.disclaimer} 호구점수는 사실 판정이나 결함 판정이 아닙니다.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <section id="timeline" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={styles.sectionNumber}>01 / MODEL TIMELINE</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">당신의 출고 시점을 찾으세요</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">연식만으로 사양을 확정하지 않습니다. MIX 표시는 생산월에 따라 부품과 센서가 섞인 구간입니다.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><CircleHelp className="h-4 w-4" /> 카드 선택 시 상세와 차트가 함께 바뀝니다.</div>
          </div>

          <div className={`${styles.panel} mb-8 p-4 sm:p-5`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_.8fr_1.4fr_.8fr_auto] lg:items-end">
              <FilterSelect id="tesla-filter-model" label="모델" value={filters.model} options={[{ value: ALL, label: 'Model 3 + Model Y' }, ...modelOptions.map((value) => ({ value, label: value }))]} onChange={(value) => updateFilter('model', value)} />
              <FilterSelect id="tesla-filter-year" label="연식" value={filters.year} options={[{ value: ALL, label: '전체 연식' }, ...yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))]} onChange={(value) => updateFilter('year', value)} />
              <FilterSelect id="tesla-filter-trim" label="트림" value={filters.trim} options={[{ value: ALL, label: '전체 트림' }, ...trimOptions.map((value) => ({ value, label: value }))]} onChange={(value) => updateFilter('trim', value)} />
              <FilterSelect id="tesla-filter-origin" label="생산국" value={filters.origin} options={[{ value: ALL, label: '전체 생산국' }, ...originOptions.map((value) => ({ value, label: value }))]} onChange={(value) => updateFilter('origin', value)} />
              <button type="button" onClick={resetFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black text-zinc-400 transition hover:border-white/25 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> 초기화</button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
              <span className="text-zinc-500">검색 결과</span>
              <span className="font-mono font-black text-red-400">{filteredCards.length} / {data.vehicleCards.length} cards</span>
            </div>
          </div>

          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]">
            <div className="order-2 space-y-10 xl:order-1">
              {Array.from(groupedCards.entries()).map(([year, cards]) => (
                <section key={year} className={styles.yearRail} aria-labelledby={`tesla-year-${year}`}>
                  <span className={styles.yearDot} />
                  <div className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
                    <h3 id={`tesla-year-${year}`} className="font-mono text-2xl font-black tracking-[-0.06em] text-white">{year}</h3>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{cards.length} configurations</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {cards.map((card) => {
                      const generation = generationById.get(card.generationId)!
                      return <VehicleTimelineCard key={card.id} card={card} generation={generation} data={data} selected={selectedCard.id === card.id} onSelect={() => selectCard(card.id)} />
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div ref={detailRef} className="order-1 scroll-mt-20 xl:order-2">
              <TeslaDetailPanel card={selectedCard} generation={selectedGeneration} generations={data.generationSpecs} scoreBand={getScoreBand(data, selectedCard.baseHoguScore)} scoreWeights={data.scoreWeights} annualRegistration={selectedAnnual} trimRegistrations={data.knownTrimRegistrations} />
            </div>
          </div>
        </section>

        <RegistrationChart registrations={data.annualModelRegistrations} trimRegistrations={data.knownTrimRegistrations} selected={selectedCard} activeModel={filters.model} years={years} />

        <VideoLab videos={data.videos} />

      </div>

      <footer className="border-t border-white/10 bg-black/25">
        <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <div className="flex items-center gap-3 font-black text-white"><span className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-xs">T</span>{data.meta.serviceName}</div>
              <p className="mt-3 max-w-md text-xs leading-5 text-zinc-500">{data.meta.salesDefinition}. {data.meta.trimSalesPolicy}. 기준일 {data.meta.asOf}.</p>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">Source catalog</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.07] px-3 py-2.5 text-xs font-semibold text-zinc-500 transition hover:border-white/20 hover:text-zinc-200"><span>{source.label}<span className="ml-2 font-mono text-[9px] text-zinc-700">{source.type}</span></span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" /></a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
