import type {
  TeslaAnnualRegistration,
  TeslaConfidence,
  TeslaGenerationSpec,
  TeslaHardware,
  TeslaTrimRegistration,
  TeslaVehicleCard,
} from '@/types/tesla'

export const HARDWARE_LABELS: Record<keyof TeslaHardware, string> = {
  autopilotComputer: '자율주행 컴퓨터',
  cameras: '카메라',
  frontBumperCamera: '전면 범퍼 카메라',
  radar: '레이더',
  uss: '초음파 센서',
  infotainment: '인포테인먼트',
  heatPump: '히트펌프',
  ventilatedSeats: '통풍시트',
  rearScreen: '뒷좌석 화면',
  stalks: '방향지시등 레버',
}

export function formatKRW(value: number | null): string {
  if (value === null) return '대표가 미확인'
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

export function formatCount(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}대`
}

export function normalizeConfidence(value?: string): TeslaConfidence {
  if (!value) return 'unknown'
  if (value === 'verified') return 'verified'
  if (value === 'unknown') return 'unknown'
  return 'mixed'
}

export function confidenceLabel(value: TeslaConfidence): string {
  if (value === 'verified') return 'verified · 검증됨'
  if (value === 'mixed') return 'mixed · 교차 확인 필요'
  return 'unknown · 미확인'
}

export function isMixedSpec(generation: TeslaGenerationSpec): boolean {
  return Object.values(generation.hardware).some((value) => value.includes('MIX'))
}

export function findAnnualRegistration(
  card: TeslaVehicleCard,
  registrations: TeslaAnnualRegistration[]
): TeslaAnnualRegistration | undefined {
  return registrations.find(
    (item) => item.year === card.year && item.model === card.model
  )
}

function periodYear(period: string): number | null {
  const year = Number(period.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export function findTrimRegistration(
  card: TeslaVehicleCard,
  registrations: TeslaTrimRegistration[]
): TeslaTrimRegistration | undefined {
  return registrations.find(
    (item) =>
      periodYear(item.period) === card.year &&
      item.model === card.model &&
      item.trim === card.trim
  )
}

export function formatRegistrationPeriod(period: string): string {
  const [start, end] = period.split('/')
  if (!start || !end) return period
  const [startYear, startMonth] = start.split('-').map(Number)
  const [, endMonth] = end.split('-').map(Number)
  const isFullYear = start.endsWith('-01-01') && end.endsWith('-12-31')
  return isFullYear
    ? `${startYear}년 연간`
    : `${startYear}년 ${startMonth}–${endMonth}월 누계`
}

export function getGenerationChanges(
  from: TeslaGenerationSpec | undefined,
  to: TeslaGenerationSpec | undefined,
  limit = 4
): string[] {
  if (!from || !to) return []

  const changes: string[] = []
  const hardwareKeys = Object.keys(HARDWARE_LABELS) as Array<keyof TeslaHardware>

  for (const key of hardwareKeys) {
    if (from.hardware[key] !== to.hardware[key]) {
      changes.push(
        `${HARDWARE_LABELS[key]}: ${from.hardware[key]} → ${to.hardware[key]}`
      )
    }
  }

  if (from.battery !== to.battery) {
    changes.push(`배터리: ${from.battery} → ${to.battery}`)
  }
  if (from.fsdKorea !== to.fsdKorea) {
    changes.push(`국내 FSD: ${from.fsdKorea} → ${to.fsdKorea}`)
  }

  return changes.slice(0, limit)
}

export function getGenerationNeighbors(
  current: TeslaGenerationSpec,
  generations: TeslaGenerationSpec[]
): {
  previous?: TeslaGenerationSpec
  next?: TeslaGenerationSpec
} {
  const sameModel = generations.filter((item) => item.model === current.model)
  const index = sameModel.findIndex((item) => item.id === current.id)
  return {
    previous: index > 0 ? sameModel[index - 1] : undefined,
    next: index >= 0 && index < sameModel.length - 1 ? sameModel[index + 1] : undefined,
  }
}

export function getExplicitFeatureHighlights(generation: TeslaGenerationSpec): string[] {
  const features: string[] = []
  const hardware = generation.hardware

  if (hardware.autopilotComputer.includes('HW4')) features.push('HW4 세대 하드웨어')
  if (hardware.ventilatedSeats.includes('있음')) features.push('앞좌석 통풍시트')
  if (hardware.rearScreen.includes('있음')) features.push('뒷좌석 화면')
  if (hardware.heatPump.includes('있음')) features.push('히트펌프 적용')
  if (generation.fsdKorea.includes('대상 가능') || generation.fsdKorea.includes('사용 가능')) {
    features.push('국내 FSD 활용 가능군')
  }
  return features.slice(0, 4)
}

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const hostname = url.hostname.replace(/^www\./, '')
    let candidate = ''

    if (hostname === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? ''
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') candidate = url.searchParams.get('v') ?? ''
      if (url.pathname.startsWith('/shorts/')) candidate = url.pathname.split('/')[2] ?? ''
      if (url.pathname.startsWith('/embed/')) candidate = url.pathname.split('/')[2] ?? ''
    }

    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
  } catch {
    return null
  }
}
