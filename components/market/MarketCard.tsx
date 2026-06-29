import Link from 'next/link'
import { Users, MessageCircle } from 'lucide-react'
import PointIcon from '@/components/ui/PointIcon'
import { cn } from '@/lib/utils'
import type { Market } from '@/types/index'

interface MarketCardProps {
  market: Market
}

const CLOSING_SOON_DAYS = 3

function VolumeDisplay({ volume }: { volume: number }) {
  const label =
    volume >= 1_000_000 ? `${(volume / 1_000_000).toFixed(1)}M`
    : volume >= 1_000   ? `${(volume / 1_000).toFixed(1)}K`
    : volume.toLocaleString()
  return (
    <span className="inline-flex items-center gap-0.5">
      <PointIcon size={10} />
      {label}
    </span>
  )
}

interface CloseDateInfo {
  label: string
  isClosingSoon: boolean
  isClosed: boolean
}

function getCloseDateInfo(dateStr: string): CloseDateInfo {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) {
    return { label: '마감됨', isClosingSoon: false, isClosed: true }
  }
  if (diffDays === 0) {
    return { label: '오늘 마감', isClosingSoon: true, isClosed: false }
  }
  if (diffDays === 1) {
    return { label: '내일 마감', isClosingSoon: true, isClosed: false }
  }
  if (diffDays <= CLOSING_SOON_DAYS) {
    return { label: `${diffDays}일 후`, isClosingSoon: true, isClosed: false }
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}일 후`, isClosingSoon: false, isClosed: false }
  }
  return {
    label: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    isClosingSoon: false,
    isClosed: false,
  }
}

function MCStackedBar({ options }: { options: NonNullable<Market['options']> }) {
  const sorted = options.slice().sort((a, b) => b.probability - a.probability)
  const top = sorted[0]
  if (!top) return null

  return (
    <div className="flex flex-col items-end gap-1 min-w-[52px]">
      <div className="h-2 w-14 rounded-full overflow-hidden flex">
        {sorted.slice(0, 5).map((opt) => (
          <div
            key={opt.id}
            style={{
              width: `${Math.max(2, Math.round(opt.probability * 100))}%`,
              backgroundColor: opt.color,
            }}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-ink-700 tabular-nums">
        {Math.round(top.probability * 100)}%
      </span>
    </div>
  )
}

export default function MarketCard({ market }: MarketCardProps) {
  const yesPercent = Math.round(market.yes_probability * 100)
  const isHigh = yesPercent >= 60
  const isLow = yesPercent <= 40
  const categoryColor = market.category?.color ?? '#6366f1'
  const closeInfo = getCloseDateInfo(market.close_date)

  const marketHref = `/market/${market.id}`

  return (
    <Link href={marketHref} className="group block">
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-canvas-50 transition-colors cursor-pointer">
        {/* 마켓 썸네일 (없으면 예견 로고) */}
        <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden bg-canvas-100 flex items-center justify-center self-start mt-0.5 border border-ink-200/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={market.thumbnail_url ?? '/logo.png'}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* 제목 + 메타 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 group-hover:text-primary line-clamp-2 leading-snug">
            {market.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-500 flex-wrap">
            {market.category && (
              <>
                <span className="font-medium" style={{ color: categoryColor }}>
                  {market.category.name}
                </span>
                <span>·</span>
              </>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {market.unique_traders.toLocaleString()}
            </span>
            <span>·</span>
            <VolumeDisplay volume={market.total_volume} />
            <span>·</span>
            <span
              className={cn(
                closeInfo.isClosingSoon && 'text-scarlet-500 font-semibold',
                closeInfo.isClosed && 'text-ink-300'
              )}
            >
              {closeInfo.label}
            </span>
            {(market.comment_count ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageCircle className="h-3 w-3" />
                  {market.comment_count}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 우측: 확률 표시 또는 결과 */}
        <div className="shrink-0 flex items-center gap-2.5">
          {market.status === 'resolved' && market.resolution ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 whitespace-nowrap">
              {market.resolution.toUpperCase()}
            </span>
          ) : market.status === 'closed' ? (
            <span className="text-xs font-medium text-ink-400 whitespace-nowrap">마감됨</span>
          ) : (
            <>
              {market.type === 'binary' && (
                <span
                  className={cn(
                    'text-lg font-bold tabular-nums leading-none',
                    isHigh && 'text-teal-500',
                    isLow && 'text-scarlet-500',
                    !isHigh && !isLow && 'text-ink-600'
                  )}
                >
                  {yesPercent}%
                </span>
              )}
              {market.type === 'multiple_choice' && market.options && market.options.length > 0 && (
                <MCStackedBar options={market.options} />
              )}
              {market.type === 'numeric' && (
                <span className="text-xs text-ink-400 font-medium px-2">수치형</span>
              )}
            </>
          )}

          {/* 예측/보기 버튼 */}
          <span
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap',
              'border-ink-200 text-ink-600 bg-canvas-0',
              'group-hover:border-primary group-hover:text-primary',
              'transition-colors'
            )}
          >
            {market.status === 'open' ? '예측' : '보기'}
          </span>
        </div>
      </div>
    </Link>
  )
}
