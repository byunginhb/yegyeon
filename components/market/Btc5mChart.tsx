'use client'

import { useEffect, useRef, useState } from 'react'

export interface PricePoint {
  t: number // epoch ms
  p: number // price
}

interface Props {
  openPrice: number
  history: PricePoint[]
  startTs: number // 라운드 시작 시각(epoch ms)
  closeTs: number // 라운드 마감 시각(epoch ms)
  height?: number
}

// 비트코인 5분 라운드 가격 차트.
// - x축: 라운드 시작~마감(5분) 고정 프레임. 시간이 지날수록 라인이 왼쪽→오른쪽으로 채워짐.
// - y축: 기준가(시작가)를 세로 중앙에 고정 → 오르면 위, 내리면 아래로 대칭으로 그려짐.
// - rAF로 현재 지점이 시간에 맞춰 부드럽게 오른쪽으로 이동.
export default function Btc5mChart({ openPrice, history, startTs, closeTs, height = 150 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [now, setNow] = useState(() => Date.now())

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 80)
    return () => clearInterval(id)
  }, [])

  const PAD_Y = 16
  const span = Math.max(1, closeTs - startTs)

  if (width === 0 || history.length === 0 || !openPrice) {
    return <div ref={wrapRef} style={{ height }} className="w-full" />
  }

  // x: 라운드 고정 프레임
  const xOf = (t: number) => ((Math.min(Math.max(t, startTs), closeTs) - startTs) / span) * width

  // y: 기준가 중앙 고정 + 대칭 범위(최대 편차 기준, 최소 폭 보장)
  const rawDev = Math.max(0, ...history.map((d) => Math.abs(d.p - openPrice)))
  const dev = Math.max(rawDev * 1.2, openPrice * 0.0002)
  const minP = openPrice - dev
  const maxP = openPrice + dev
  const yOf = (p: number) => PAD_Y + (1 - (p - minP) / (maxP - minP)) * (height - 2 * PAD_Y)

  const clampedNow = Math.min(now, closeTs)
  const lastPt = history[history.length - 1]
  const leadX = xOf(clampedNow)
  const leadY = yOf(lastPt.p)
  const baseY = yOf(openPrice) // 중앙

  // 라인: 데이터 포인트 + 현재 시각까지 수평 연장(리딩 엣지 글라이드)
  const segs = history.map((pt) => `${xOf(pt.t).toFixed(1)} ${yOf(pt.p).toFixed(2)}`)
  const d = `M ${segs.join(' L ')} L ${leadX.toFixed(1)} ${leadY.toFixed(2)}`

  const up = lastPt.p >= openPrice
  const stroke = up ? '#0d9488' : '#e11d48' // teal-600 / scarlet-600
  const fillId = 'btc5m-area'
  const firstX = xOf(history[0].t)

  return (
    <div ref={wrapRef} style={{ height }} className="relative w-full overflow-hidden">
      <svg width={width} height={height} className="block">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 기준가(시작가) 점선 — 세로 중앙 */}
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
        <text x={4} y={baseY - 4} className="fill-ink-400" fontSize={9}>
          기준가
        </text>

        {/* 영역 채움 */}
        <path d={`${d} L ${leadX.toFixed(1)} ${height} L ${firstX.toFixed(1)} ${height} Z`} fill={`url(#${fillId})`} />

        {/* 가격 라인 */}
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* 현재 지점 점멸 도트 */}
        <circle cx={leadX} cy={leadY} r={6} fill={stroke} opacity={0.18}>
          <animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.05;0.25" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={leadX} cy={leadY} r={3} fill={stroke} />
      </svg>
    </div>
  )
}
