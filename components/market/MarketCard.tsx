import Link from 'next/link'
import { Users, MessageCircle } from 'lucide-react'
import PointIcon from '@/components/ui/PointIcon'
import type { Market } from '@/types/index'

interface MarketCardProps {
  market: Market
}

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

function formatCloseDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '마감됨'
  if (diffDays === 0) return '오늘 마감'
  if (diffDays === 1) return '내일 마감'
  if (diffDays <= 7) return `${diffDays}일 후`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function ProbabilityBar({ percent }: { percent: number }) {
  const colorClass =
    percent >= 60 ? 'bg-teal-500'
    : percent <= 40 ? 'bg-scarlet-500'
    : 'bg-ink-400'
  return (
    <div className="h-1 w-full bg-ink-200/40 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all`}
        style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
      />
    </div>
  )
}

export default function MarketCard({ market }: MarketCardProps) {
  const yesPercent = Math.round(market.yes_probability * 100)
  const isHigh = yesPercent >= 60
  const isLow = yesPercent <= 40
  const categoryColor = market.category?.color ?? '#6366f1'

  return (
    <Link href={`/market/${market.id}`} className="group block">
      <div className="relative flex items-start gap-3 px-4 py-4 hover:bg-canvas-50 rounded-xl transition-colors cursor-pointer">
        {/* 카테고리 컬러 인디케이터 */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-70 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: categoryColor }}
          aria-hidden
        />

        {/* 생성자 아바타 */}
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ml-1">
          {market.creator?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={market.creator.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-bold text-primary">
              {(market.creator?.display_name ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        {/* 제목 + 메타 */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-ink-900 group-hover:text-primary line-clamp-2 leading-snug">
            {market.title}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-ink-500 flex-wrap">
            {market.category && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `${categoryColor}1a`,
                  color: categoryColor,
                }}
              >
                <span>{market.category.icon}</span>
                <span>{market.category.name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {market.unique_traders.toLocaleString()}
            </span>
            <span>·</span>
            <VolumeDisplay volume={market.total_volume} />
            <span>·</span>
            <span>{formatCloseDate(market.close_date)}</span>
            {(market.comment_count ?? 0) > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {market.comment_count}
                </span>
              </>
            )}
          </div>

          {/* Binary 마켓: 확률 바 */}
          {market.type === 'binary' && (
            <div className="mt-2.5">
              <ProbabilityBar percent={yesPercent} />
            </div>
          )}

          {/* Multiple Choice: 상위 옵션 미리보기 */}
          {market.type === 'multiple_choice' && market.options && market.options.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {market.options
                .slice()
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 3)
                .map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center gap-1 text-[11px] text-ink-600 px-1.5 py-0.5 rounded-md bg-ink-200/30"
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className="truncate max-w-[7rem]">{opt.text}</span>
                    <span className="font-medium text-ink-700">
                      {Math.round(opt.probability * 100)}%
                    </span>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* 우측 확률/유형 라벨 */}
        {market.type === 'binary' && (
          <div className="shrink-0 text-right min-w-[52px]">
            <p
              className={`text-xl font-bold tabular-nums leading-tight ${
                isHigh ? 'text-teal-500' : isLow ? 'text-scarlet-500' : 'text-ink-700'
              }`}
            >
              {yesPercent}%
            </p>
            <p className="text-[10px] text-ink-400 font-medium tracking-wide">YES 확률</p>
          </div>
        )}
        {market.type === 'multiple_choice' && (
          <div className="shrink-0 text-right min-w-[52px]">
            <p className="text-xs text-ink-500 font-medium px-1.5 py-0.5 bg-ink-200/30 rounded-md inline-block">
              선택형
            </p>
          </div>
        )}
        {market.type === 'numeric' && (
          <div className="shrink-0 text-right min-w-[52px]">
            <p className="text-xs text-ink-500 font-medium px-1.5 py-0.5 bg-ink-200/30 rounded-md inline-block">
              수치형
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
