'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/categoryIcon'
import type { Category } from '@/types/index'

interface FilterBarProps {
  categories: Category[]
}

const SORT_OPTIONS = [
  { value: 'trending', label: '인기순' },
  { value: 'newest', label: '최신순' },
  { value: 'closing_soon', label: '마감임박' },
  { value: 'volume', label: '거래량' },
]

const SEARCH_DEBOUNCE_MS = 300

/**
 * 메인 페이지 필터 바.
 * 검색 + 카테고리 칩 + 정렬 탭 통합.
 */
export default function FilterBar({ categories }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get('category') ?? 'all'
  const activeSort = searchParams.get('sort') ?? 'trending'
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // URL 검색어 변경 시 인풋 동기화 (외부에서 변경된 경우)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // 검색어 디바운스 → URL 업데이트
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim()) {
        params.set('q', query.trim())
      } else {
        params.delete('q')
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSelectCategory = useCallback(
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

  const handleSelectSort = useCallback(
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
    <div className="flex flex-col gap-3 mb-4">
      {/* 검색 인풋 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="마켓 검색..."
          className={cn(
            'w-full pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-canvas-0',
            'text-sm text-ink-900 placeholder:text-ink-400',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'transition-colors'
          )}
        />
      </div>

      {/* 카테고리 칩 + 정렬 탭 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* 카테고리 칩 (가로 스크롤) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0">
          <CategoryChip
            slug="all"
            label="전체"
            color="#6366f1"
            isActive={activeCategory === 'all'}
            onClick={() => handleSelectCategory('all')}
            forceIcon
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              slug={cat.slug}
              label={cat.name}
              color={cat.color}
              isActive={activeCategory === cat.slug}
              onClick={() => handleSelectCategory(cat.slug)}
            />
          ))}
        </div>

        {/* 정렬 탭 */}
        <div className="flex gap-1 shrink-0">
          {SORT_OPTIONS.map(({ value, label }) => {
            const isActive = activeSort === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelectSort(value)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150',
                  isActive
                    ? 'bg-ink-900 text-ink-0'
                    : 'text-ink-500 hover:text-ink-900 hover:bg-canvas-50'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface CategoryChipProps {
  slug: string
  label: string
  color: string
  isActive: boolean
  onClick: () => void
  /** "전체"처럼 슬러그 매핑이 없을 때 Globe 아이콘 사용 */
  forceIcon?: boolean
}

function CategoryChip({
  slug,
  label,
  color,
  isActive,
  onClick,
  forceIcon,
}: CategoryChipProps) {
  const Icon = forceIcon ? Globe : getCategoryIcon(slug)

  return (
    <button
      type="button"
      onClick={onClick}
      style={
        isActive
          ? { backgroundColor: color, borderColor: color, color: '#ffffff' }
          : undefined
      }
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 border',
        isActive
          ? 'shadow-sm'
          : 'bg-canvas-0 text-ink-600 border-ink-200 hover:border-ink-400 hover:text-ink-900'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  )
}
