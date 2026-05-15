'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: Array<{ value: string; label: string; icon?: LucideIcon }> = [
  { value: 'trending', label: '인기순', icon: TrendingUp },
  { value: 'newest', label: '최신순' },
  { value: 'closing_soon', label: '마감임박' },
  { value: 'volume', label: '거래량' },
]

interface SortTabsProps {
  className?: string
}

export default function SortTabs({ className }: SortTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeSort = searchParams.get('sort') || 'trending'

  const handleSelect = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'trending') {
        params.delete('sort')
      } else {
        params.set('sort', value)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className={cn('flex gap-1', className)}>
      {SORT_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = activeSort === value
        return (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150',
              isActive
                ? 'bg-ink-900 text-ink-0'
                : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
