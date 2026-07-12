'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

// 마감까지 남은 시간 카운트다운.
// 성능 보호(단계별 갱신): 평상시 1초, 10분 이내 0.1초, 마지막 1분 0.01초(밀리초 느낌).
//   → 무거운 고빈도 갱신은 마감 임박 카드에만 적용된다.
const LAST_MINUTE_MS = 60_000
const LAST_10MIN_MS = 600_000

function diff(closeDate: string): number {
  return new Date(closeDate).getTime() - Date.now()
}

function tickInterval(remaining: number): number {
  if (remaining < LAST_MINUTE_MS) return 50 // 센티초가 살아있게 보이도록
  if (remaining < LAST_10MIN_MS) return 100
  return 1000
}

function format(remaining: number): string {
  if (remaining <= 0) return '마감됨'

  const totalSec = remaining / 1000
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = Math.floor(totalSec % 60)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (remaining < LAST_MINUTE_MS) {
    // 마지막 1분: 분:초.센티초 (00:47.62)
    const cs = Math.floor((remaining % 1000) / 10)
    return `${mm}:${ss}.${String(cs).padStart(2, '0')}`
  }
  if (remaining < LAST_10MIN_MS) {
    // 10분 이내: 분:초.십분의일초 (09:58.4)
    const tenths = Math.floor((remaining % 1000) / 100)
    return `${mm}:${ss}.${tenths}`
  }
  if (days > 0) return `${days}일 ${hours}시간`
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분 ${seconds}초`
}

export default function BetCloseCountdown({ closeDate }: { closeDate: string }) {
  // null = 아직 클라이언트 마운트 전. 서버/클라이언트 시각 차이로 인한
  // 하이드레이션 불일치를 피하려고 마운트 후에만 실제 값을 계산한다.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>
    // 남은 시간에 따라 갱신 주기를 바꿔가며 스스로 재예약한다.
    // (임박 구간에서만 100ms, 그 외엔 1초 → 불필요한 리렌더 방지)
    const schedule = () => {
      const left = diff(closeDate)
      setRemaining(left)
      if (left <= 0) return
      id = setTimeout(schedule, tickInterval(left))
    }
    schedule()
    return () => clearTimeout(id)
  }, [closeDate])

  const imminent = remaining !== null && remaining > 0 && remaining < LAST_MINUTE_MS
  const closed = remaining !== null && remaining <= 0

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs tabular-nums ${
        closed ? 'text-ink-400' : imminent ? 'text-scarlet-500 font-semibold' : 'text-ink-500'
      }`}
    >
      <Clock className="h-3 w-3" />
      {remaining === null ? '마감까지 …' : closed ? '마감됨' : `마감까지 ${format(remaining)}`}
    </span>
  )
}
