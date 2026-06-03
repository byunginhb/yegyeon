'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, TrendingUp } from 'lucide-react'

interface MarqueeMarket {
  id: string
  title: string
  thumbnailUrl: string | null
  totalVolume: number
  uniqueTraders: number
  isHot: boolean
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

export default function MarketMarquee() {
  const [items, setItems] = useState<MarqueeMarket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/markets/marquee')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.success && Array.isArray(j.data)) setItems(j.data)
        setLoading(false)
      })
      .catch(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || items.length === 0) return null

  // 자연스러운 무한 루프를 위해 콘텐츠 2회 복제
  const doubled = [...items, ...items]
  const duration = `${Math.max(35, items.length * 3.5)}s`

  return (
    <div
      className="ticker-pause relative w-full overflow-hidden rounded-xl border border-ink-200/40 bg-canvas-0/40 backdrop-blur-sm
                 [mask-image:linear-gradient(90deg,transparent_0%,#000_4%,#000_96%,transparent_100%)]"
      aria-label="인기 마켓 흐름"
    >
      <ul
        className="animate-ticker-right flex w-max gap-3 py-2.5 pl-3 pr-3"
        style={{ ['--ticker-duration' as string]: duration }}
      >
        {doubled.map((m, idx) => (
          <li key={`${m.id}-${idx}`}>
            <Link
              href={`/market/${m.id}`}
              className={
                m.isHot
                  ? 'hot-border flex items-center gap-2 rounded-full bg-canvas-0 px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:bg-canvas-50'
                  : 'flex items-center gap-2 rounded-full border border-ink-200/40 bg-canvas-0/60 px-3 py-1.5 text-sm text-ink-700 transition-colors hover:border-primary/40 hover:text-ink-900'
              }
            >
              {m.isHot ? (
                <Flame className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-ink-400" />
              )}
              <span className="max-w-[260px] truncate">{m.title}</span>
              <span className="text-[11px] tabular-nums text-ink-400">
                ₣{formatVolume(m.totalVolume)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
