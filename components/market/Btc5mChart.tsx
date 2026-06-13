'use client'

import { useEffect, useRef, useState } from 'react'

export interface PricePoint {
  t: number // epoch ms
  p: number // price
}

interface Props {
  openPrice: number
  history: PricePoint[]
  windowMs?: number // 표시 시간창 (기본 2분)
  height?: number
}

// 비트코인 5분 라운드 실시간 가격 라인 차트.
// - 기준가(시작가) 점선 + 등락에 따른 라인 색
// - rAF로 오른쪽 끝(현재)이 시간에 맞춰 좌측으로 연속 스크롤 → 폴링 간격에도 부드럽게 이동
export default function Btc5mChart({ openPrice, history, windowMs = 120000, height = 140 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // 컨테이너 너비 측정 (왜곡 없는 픽셀 좌표 계산용)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // 연속 스크롤용 시계 (12fps — 가벼우면서 충분히 부드러움)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 80)
    return () => clearInterval(id)
  }, [])

  const PAD_Y = 14
  // 시계 오차로 서버 샘플 시각이 클라 now보다 미래여도 잘리지 않도록 데이터 최댓값과 비교
  const lastT = history.length ? history[history.length - 1].t : now
  const rightEdge = Math.max(now, lastT)
  const leftEdge = rightEdge - windowMs

  // 표시창 내 포인트만 (앞에 하나 더 포함해 왼쪽 잘림 자연스럽게)
  const pts = history.filter((d) => d.t >= leftEdge - 5000 && d.t <= rightEdge + 1000)

  if (width === 0 || pts.length === 0) {
    return <div ref={wrapRef} style={{ height }} className="w-full" />
  }

  const prices = pts.map((d) => d.p).concat(openPrice)
  let minP = Math.min(...prices)
  let maxP = Math.max(...prices)
  if (maxP - minP < 1) {
    // 변동이 거의 없을 때 평탄선이 가운데 오도록 패딩
    const mid = (maxP + minP) / 2
    minP = mid - 1
    maxP = mid + 1
  }
  const spanP = maxP - minP

  const xOf = (t: number) => ((t - leftEdge) / windowMs) * width
  const yOf = (p: number) => PAD_Y + (1 - (p - minP) / spanP) * (height - 2 * PAD_Y)

  const last = pts[pts.length - 1]
  const lastX = Math.min(xOf(last.t), width - 1)
  const lastY = yOf(last.p)
  const baseY = yOf(openPrice)

  // 라인 path (직선 세그먼트 — 데이터에 충실)
  const d = pts
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xOf(pt.t).toFixed(1)} ${yOf(pt.p).toFixed(2)}`)
    .join(' ')

  const up = last.p >= openPrice
  const stroke = up ? '#0d9488' : '#e11d48' // teal-600 / scarlet-600
  const fillId = 'btc5m-area'

  return (
    <div ref={wrapRef} style={{ height }} className="relative w-full overflow-hidden">
      <svg width={width} height={height} className="block">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 기준가(시작가) 점선 */}
        {baseY >= 0 && baseY <= height && (
          <>
            <line
              x1={0}
              y1={baseY}
              x2={width}
              y2={baseY}
              stroke="currentColor"
              className="text-ink-300"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text x={4} y={baseY - 3} className="fill-ink-400" fontSize={9}>
              기준가
            </text>
          </>
        )}

        {/* 영역 채움 */}
        <path d={`${d} L ${lastX.toFixed(1)} ${height} L ${xOf(pts[0].t).toFixed(1)} ${height} Z`} fill={`url(#${fillId})`} />

        {/* 가격 라인 */}
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* 현재 지점 점멸 도트 */}
        <circle cx={lastX} cy={lastY} r={6} fill={stroke} opacity={0.18}>
          <animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.05;0.25" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={lastX} cy={lastY} r={3} fill={stroke} />
      </svg>
    </div>
  )
}
