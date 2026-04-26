'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import {
  Globe,
  Landmark,
  TrendingUp,
  Trophy,
  Monitor,
  Film,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryItem {
  slug: string
  label: string
  icon: LucideIcon
}

const CATEGORIES: CategoryItem[] = [
  { slug: 'all', label: '전체', icon: Globe },
  { slug: 'politics', label: '정치', icon: Landmark },
  { slug: 'economy', label: '경제', icon: TrendingUp },
  { slug: 'sports', label: '스포츠', icon: Trophy },
  { slug: 'tech', label: '테크', icon: Monitor },
  { slug: 'entertainment', label: '엔터', icon: Film },
  { slug: 'other', label: '기타', icon: Tag },
]

interface CategoryTabsProps {
  className?: string
}

export default function CategoryTabs({ className }: CategoryTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get('category') || 'all'

  const handleSelect = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug === 'all') {
        params.delete('category')
      } else {
        params.set('category', slug)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className={cn('flex gap-1 overflow-x-auto pb-1 scrollbar-none', className)}>
      {CATEGORIES.map((item) => {
        const isActive = activeCategory === item.slug
        return (
          <button
            key={item.slug}
            onClick={() => handleSelect(item.slug)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-canvas-0 text-ink-600 border border-ink-200 hover:border-ink-400 hover:text-ink-900'
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
