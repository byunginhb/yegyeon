import PointIcon from './PointIcon'
import { cn } from '@/lib/utils'

interface PointsDisplayProps {
  amount: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

const sizeMap = {
  xs: { icon: 11, text: 'text-xs' },
  sm: { icon: 13, text: 'text-sm' },
  md: { icon: 15, text: 'text-base' },
  lg: { icon: 18, text: 'text-lg' },
}

export default function PointsDisplay({
  amount,
  size = 'sm',
  className,
  showLabel = false,
}: PointsDisplayProps) {
  const { icon, text } = sizeMap[size]
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', text, className)}>
      <PointIcon size={icon} />
      {amount.toLocaleString()}
      {showLabel && <span className="font-normal text-ink-500 ml-0.5">포인트</span>}
    </span>
  )
}

/** 문자열 포맷 (아이콘 없이 숫자만 필요할 때) */
export function formatPoints(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toLocaleString()
}
