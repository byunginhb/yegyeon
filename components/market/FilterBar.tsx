'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Search, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/index'

interface FilterBarProps {
  categories: Category[]
}

const SORT_OPTIONS: Array<{ value: string; label: string; icon?: LucideIcon }> = [
  { value: 'trending', label: '인기순', icon: TrendingUp },
  { value: 'newest', label: '최신순' },
  { value: 'closing_soon', label: '마감임박' },
  { value: 'volume', label: '거래량' },
]

const SEARCH_DEBOUNCE_MS = 300

export default function FilterBar({ categories }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeCategory = searchParams.get('category') ?? 'all'
  const activeSort = searchParams.get('sort') ?? 'trending'
  const initialQuery = searchParams.get('q') ?? ''

  const [isPending, startTransition] = useTransition()
  // 서버 네비게이션이 끝나기 전까지 클릭한 탭을 즉시 활성으로 보여주기 위한 낙관적 상태
  const [optimisticCategory, setOptimisticCategory] = useState<string | null>(null)
  const [optimisticSort, setOptimisticSort] = useState<string | null>(null)

  // URL(searchParams)이 바뀌면(네비게이션 완료·뒤로가기 등) 낙관적 상태를 해제한다.
  // 렌더 중 조정 패턴 — 이펙트 없이 이전 값과 비교 (뒤로가기에도 정확히 동작)
  const [prevActiveCategory, setPrevActiveCategory] = useState(activeCategory)
  if (prevActiveCategory !== activeCategory) {
    setPrevActiveCategory(activeCategory)
    setOptimisticCategory(null)
  }
  const [prevActiveSort, setPrevActiveSort] = useState(activeSort)
  if (prevActiveSort !== activeSort) {
    setPrevActiveSort(activeSort)
    setOptimisticSort(null)
  }

  const displayCategory = optimisticCategory ?? activeCategory
  const displaySort = optimisticSort ?? activeSort

  const [query, setQuery] = useState(initialQuery)
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // URL 파라미터가 외부에서 바뀌면(뒤로가기 등) 인풋 동기화
  if (prevInitialQuery !== initialQuery) {
    setPrevInitialQuery(initialQuery)
    setQuery(initialQuery)
  }

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
      if (slug === displayCategory) return
      setOptimisticCategory(slug)
      const params = new URLSearchParams(searchParams.toString())
      if (slug === 'all') {
        params.delete('category')
      } else {
        params.set('category', slug)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, displayCategory]
  )

  const handleSelectSort = useCallback(
    (value: string) => {
      if (value === displaySort) return
      setOptimisticSort(value)
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'trending') {
        params.delete('sort')
      } else {
        params.set('sort', value)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, displaySort]
  )

  return (
    <div className="flex flex-col mb-3">
      {/* 1. 카테고리 탭 (텍스트 전용, 하단 인디케이터) */}
      <div className="relative flex overflow-x-auto scrollbar-none border-b border-ink-200/60 -mx-4 px-4">
        <CategoryTab
          label="전체"
          isActive={displayCategory === 'all'}
          onClick={() => handleSelectCategory('all')}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat.id}
            label={cat.name}
            isActive={displayCategory === cat.slug}
            onClick={() => handleSelectCategory(cat.slug)}
          />
        ))}
        {/* 전환 중 진행 표시 — 클릭 즉시 반응한다는 시각 피드백 */}
        {isPending && (
          <span className="pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
            <span className="block h-full w-1/3 animate-filter-progress bg-primary/70" />
          </span>
        )}
      </div>

      {/* 2. 검색 인풋 */}
      <div className="relative mt-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="마켓 검색..."
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink-200 bg-canvas-0',
            'text-sm text-ink-900 placeholder:text-ink-400',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'transition-colors'
          )}
        />
      </div>

      {/* 3. 정렬 필터 pills */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {SORT_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = displaySort === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleSelectSort(value)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-canvas-0 text-ink-500 border border-ink-200 hover:border-ink-400 hover:text-ink-900'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CategoryTab({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-3.5 py-2.5 text-sm whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer',
        isActive
          ? 'text-primary font-semibold'
          : 'text-ink-500 font-medium hover:text-ink-900'
      )}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-sm" />
      )}
    </button>
  )
}
