import {
  AlertTriangle,
  BatteryCharging,
  CircleCheck,
  Cpu,
  Gauge,
  Radar,
  ShieldQuestion,
} from 'lucide-react'
import type {
  TeslaAnnualRegistration,
  TeslaGenerationSpec,
  TeslaTrimRegistration,
  TeslaVehicleCard,
} from '@/types/tesla'
import {
  HARDWARE_LABELS,
  confidenceLabel,
  findTrimRegistration,
  formatCount,
  formatKRW,
  formatRegistrationPeriod,
  getGenerationChanges,
  getGenerationNeighbors,
  getExplicitFeatureHighlights,
  isMixedSpec,
  normalizeConfidence,
} from './tesla-utils'
import styles from './TeslaHoguPage.module.css'

interface TeslaDetailPanelProps {
  card: TeslaVehicleCard
  generation: TeslaGenerationSpec
  generations: TeslaGenerationSpec[]
  scoreBand: string
  scoreWeights: Array<{ key: string; label: string; max: number }>
  annualRegistration?: TeslaAnnualRegistration
  trimRegistrations: TeslaTrimRegistration[]
}

function scoreColor(score: number): string {
  if (score >= 65) return '#ff4b50'
  if (score >= 50) return '#f59e0b'
  if (score >= 35) return '#facc15'
  return '#34d399'
}

export default function TeslaDetailPanel({
  card,
  generation,
  generations,
  scoreBand,
  scoreWeights,
  annualRegistration,
  trimRegistrations,
}: TeslaDetailPanelProps) {
  const trimRegistration = findTrimRegistration(card, trimRegistrations)
  const confidence = normalizeConfidence(
    generation.confidence === 'mixed' ? 'mixed' : card.confidence
  )
  const { previous, next } = getGenerationNeighbors(generation, generations)
  const previousChanges = getGenerationChanges(previous, generation)
  const nextChanges = getGenerationChanges(generation, next)
  const featureHighlights = getExplicitFeatureHighlights(generation)
  const color = scoreColor(card.baseHoguScore)

  return (
    <aside className={`${styles.panel} overflow-hidden xl:sticky xl:top-20`} aria-live="polite">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(232,33,39,0.18),transparent_55%)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className={styles.sectionNumber}>SELECTED / {card.year}</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
              {card.model}
            </h3>
            <p className="mt-1 text-sm font-bold text-zinc-300">{card.trim}</p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">{generation.label} · {generation.period}</p>
          </div>
          <div
            className={styles.scoreDial}
            style={{
              '--score': card.baseHoguScore,
              '--score-color': color,
            } as React.CSSProperties}
            aria-label={`밈·비교용 호구점수 ${card.baseHoguScore}점`}
          >
            <div className="text-center">
              <strong className="font-mono text-3xl font-black tabular-nums text-white">
                {card.baseHoguScore}
              </strong>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">/ 100</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full px-3 py-1 text-xs font-black text-black" style={{ backgroundColor: color }}>
            {scoreBand}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-400">
            밈·비교용 점수
          </span>
          <span className="rounded-full border border-red-400/20 bg-red-400/[0.06] px-3 py-1 text-xs font-bold text-red-300">
            높을수록 호구 ↑
          </span>
        </div>
        <p className="mt-4 text-sm font-medium leading-6 text-zinc-200">{card.oneLine}</p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {isMixedSpec(generation) && (
          <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-300/[0.06] p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-5 text-amber-100/75">
              MIX 사양입니다. 같은 연식도 VIN·생산월·실차 옵션을 반드시 확인하세요.
              <span className="mt-1 block font-mono text-[11px] text-amber-200/60">{generation.vinHint}</span>
            </p>
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-red-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">점수가 오른 이유</h4>
          </div>
          <ol className="space-y-2">
            {card.scoreReasons.map((reason, index) => (
              <li key={reason} className="flex gap-3 text-sm leading-5 text-zinc-300">
                <span className="font-mono text-xs font-black text-red-400">0{index + 1}</span>
                {reason}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">데이터상 적용 사양</h4>
          </div>
          {featureHighlights.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {featureHighlights.map((feature) => (
                <span key={feature} className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5 text-xs font-bold text-emerald-200/80">
                  {feature}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">데이터에서 명시적으로 확인되는 적용 사양이 없습니다.</p>
          )}
          <p className="mt-2 text-[11px] leading-4 text-zinc-600">사양 적용 여부만 표시하며 점수 상쇄폭은 임의로 계산하지 않습니다.</p>
        </section>

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {[
            ['대표 판매가', formatKRW(card.representativePriceKRW)],
            ['보조금 구간', card.subsidySummary],
            ['생산', `${generation.origin} · ${generation.factory}`],
            ['국내 FSD', generation.fsdKorea],
            ['배터리', generation.battery],
            ['BMS·수리', generation.bmsRisk],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-zinc-200">{value}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-red-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">하드웨어 체크</h4>
          </div>
          <dl className="divide-y divide-white/[0.07] rounded-xl border border-white/10 px-3">
            {(Object.entries(generation.hardware) as Array<[keyof typeof generation.hardware, string]>).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-xs">
                <dt className="text-zinc-500">{HARDWARE_LABELS[key]}</dt>
                <dd className={`text-right font-semibold ${value.includes('MIX') ? 'text-amber-300' : 'text-zinc-200'}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-red-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">데이터상 세대 변화</h4>
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[11px] font-black text-zinc-500">직전 세대{previous ? ` · ${previous.label}` : ''}</p>
            {previousChanges.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-300">
                {previousChanges.map((change) => <li key={change}>— {change}</li>)}
              </ul>
            ) : <p className="mt-2 text-xs text-zinc-500">비교할 이전 세대 데이터가 없습니다.</p>}
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-[11px] font-black text-zinc-500">다음 세대{next ? ` · ${next.label}` : ''}</p>
            {nextChanges.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-300">
                {nextChanges.map((change) => <li key={change}>— {change}</li>)}
              </ul>
            ) : <p className="mt-2 text-xs text-zinc-500">비교할 다음 세대 데이터가 없습니다.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2">
            <BatteryCharging className="h-4 w-4 text-red-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">등록대수</h4>
          </div>
          {annualRegistration ? (
            <>
              <p className="mt-3 font-mono text-2xl font-black tabular-nums text-white">{formatCount(annualRegistration.count)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {annualRegistration.scope} · {card.model} 전체 · {trimRegistration ? '트림 확인치 별도 표기' : '트림별 대수 미확인'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm font-bold text-zinc-400">연간 모델 전체 집계 없음</p>
          )}
          {trimRegistration && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-bold text-red-300">{card.trim} · {formatCount(trimRegistration.count)}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatRegistrationPeriod(trimRegistration.period)} 확인치</p>
              {trimRegistration.note && <p className="mt-1 text-[11px] leading-4 text-zinc-500">{trimRegistration.note}</p>}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-red-400" />
            <h4 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-300">점수 배점표</h4>
          </div>
          <div className="space-y-2">
            {scoreWeights.map((weight) => (
              <div key={weight.key}>
                <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
                  <span>{weight.label}</span><span>최대 {weight.max}점</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-zinc-500" style={{ width: `${weight.max}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-zinc-600">카드별 세부 항목 점수는 제공 데이터에 없어 임의로 나누지 않았습니다.</p>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs">
          <span className="font-bold text-zinc-500">데이터 신뢰도</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-300">
            {confidenceLabel(confidence)}
          </span>
        </div>
      </div>
    </aside>
  )
}
