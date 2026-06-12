'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

interface TickerComment {
  id: string
  content: string
  created_at: string
  marketId: string
  marketTitle: string
  userName: string
  userAvatar: string | null
}

export default function CommentTicker() {
  const [items, setItems] = useState<TickerComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/comments/recent')
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

  if (loading) {
    return (
      <div className="px-2 py-3 text-[11px] text-ink-400">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <MessageCircle className="h-3 w-3" />
          <span>실시간 댓글</span>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-canvas-0/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  // 댓글 수가 적어도 컨테이너를 항상 채우도록 짝수 회 복제.
  // (절반 위치로 이동하는 무한 루프 패턴 — 한 사본 길이가 컨테이너보다 작으면 빈 공간 발생)
  const MIN_TOTAL_CARDS = 12
  const baseFactor = Math.max(2, Math.ceil(MIN_TOTAL_CARDS / items.length))
  const repeatFactor = baseFactor % 2 === 0 ? baseFactor : baseFactor + 1
  const expanded: TickerComment[] = Array.from({ length: repeatFactor }, () => items).flat()
  // 한 사이클당 (전체 카드 수 / 2) 만큼 이동 → 그 거리에 비례한 duration
  const cardsPerCycle = (repeatFactor * items.length) / 2
  const duration = `${Math.max(20, cardsPerCycle * 2.0)}s`

  return (
    <div className="px-2 pt-5 pb-2">
      <div className="flex items-center gap-1.5 mb-3 px-1 text-[11px] uppercase tracking-wide text-ink-500">
        <MessageCircle className="h-3 w-3" />
        <span>실시간 댓글</span>
      </div>
      <div
        className="ticker-pause relative h-[260px] overflow-hidden rounded-lg
                   [mask-image:linear-gradient(180deg,transparent_0%,#000_3%,#000_97%,transparent_100%)]"
      >
        <ul
          className="animate-ticker-up flex flex-col gap-1.5"
          style={{ ['--ticker-duration' as string]: duration }}
        >
          {expanded.map((c, idx) => (
            <li key={`${c.id}-${idx}`}>
              <Link
                href={`/market/${c.marketId}`}
                className="block rounded-lg border border-ink-200/40 bg-canvas-0/40 px-2.5 py-1.5
                           hover:border-primary/40 hover:bg-canvas-0 transition-colors"
              >
                <p className="text-[10px] text-ink-500 truncate mb-0.5">
                  <span className="font-medium text-ink-600">{c.userName}</span>
                  <span className="mx-1 text-ink-400">·</span>
                  <span className="text-ink-400">{c.marketTitle}</span>
                </p>
                <p className="text-[11px] text-ink-700 line-clamp-2 leading-snug">
                  {c.content}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
