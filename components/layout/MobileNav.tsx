'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, BarChart2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', icon: Home, label: '홈', exact: true },
  { href: '/browse', icon: Search, label: '탐색', exact: false },
  { href: '/market/create', icon: PlusCircle, label: '만들기', exact: false },
  { href: '/leaderboard', icon: BarChart2, label: '랭킹', exact: false },
  { href: '/portfolio', icon: User, label: '마이페이지', exact: false },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink-200 bg-canvas-0/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-around h-14 px-1 safe-area-inset-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]',
                isActive
                  ? 'text-primary'
                  : 'text-ink-400 hover:text-ink-800'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
