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

  // 자연스러운 무한 루프를 위해 콘텐츠 2회 복제
  const doubled = [...items, ...items]
  // 콘텐츠 길이에 비례한 duration (아이템당 ~3.5초)
  const duration = `${Math.max(30, items.length * 3.5)}s`

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] uppercase tracking-wide text-ink-500">
        <MessageCircle className="h-3 w-3" />
        <span>실시간 댓글</span>
      </div>
      <div
        className="ticker-pause relative h-64 overflow-hidden rounded-lg
                   [mask-image:linear-gradient(180deg,transparent_0%,#000_12%,#000_88%,transparent_100%)]"
      >
        <ul
          className="animate-ticker-up flex flex-col gap-2"
          style={{ ['--ticker-duration' as string]: duration }}
        >
          {doubled.map((c, idx) => (
            <li key={`${c.id}-${idx}`}>
              <Link
                href={`/market/${c.marketId}`}
                className="block rounded-lg border border-ink-200/40 bg-canvas-0/40 px-2.5 py-2
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
