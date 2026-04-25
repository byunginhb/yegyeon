'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  defaultValue?: string
  className?: string
}

export default function SearchInput({ defaultValue = '', className }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set('search', value)
        } else {
          params.delete('search')
        }
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
      }, 400)
    },
    [router, pathname, searchParams]
  )

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="마켓 검색..."
      className={cn(
        'w-full pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-canvas-0',
        'text-sm text-ink-900 placeholder:text-ink-400',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
        'transition-colors',
        className
      )}
    />
  )
}
