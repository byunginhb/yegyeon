'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Clock,
  Users,
  Coins,
  Tag,
  AlertTriangle,
  Megaphone,
  ScrollText,
  Settings,
  FileText,
  Menu,
  type LucideIcon,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/markets', label: '마켓 관리', icon: TrendingUp },
  { href: '/admin/markets/pending', label: '승인 대기', icon: Clock },
  { href: '/admin/users', label: '유저 관리', icon: Users },
  { href: '/admin/points', label: '포인트 관리', icon: Coins },
  { href: '/admin/categories', label: '카테고리', icon: Tag },
  { href: '/admin/reports', label: '신고 관리', icon: AlertTriangle },
  { href: '/admin/announcements', label: '공지사항', icon: Megaphone },
  { href: '/admin/legal', label: '약관 관리', icon: FileText },
  { href: '/admin/logs', label: '관리 로그', icon: ScrollText },
  { href: '/admin/settings', label: '서비스 설정', icon: Settings },
]

// 가장 길게 매칭되는 경로 하나만 active 처리 (예: /admin/markets/pending 에서 마켓 관리와 승인 대기가 동시에 켜지지 않도록)
function activeHref(pathname: string): string | undefined {
  return navItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const active = activeHref(pathname)
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            item.href === active
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-ink-700 hover:bg-canvas-100 hover:text-ink-900'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </>
  )
}

/** 데스크탑(lg+) 사이드바 */
export function AdminSidebar({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 bg-canvas-0 border-r border-border flex-col hidden lg:flex">
      <div className="px-4 py-5 border-b border-border">
        <div className="text-sm font-semibold text-ink-900">예견 관리자</div>
        {displayName && <div className="text-xs text-ink-500 mt-0.5">{displayName}</div>}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <NavLinks pathname={pathname} />
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <Link href="/" className="text-xs text-ink-500 hover:text-ink-700 transition-colors">
          ← 서비스로 돌아가기
        </Link>
      </div>
    </aside>
  )
}

/** 모바일(lg 미만) 상단 헤더 + 햄버거 → 왼쪽 슬라이드 메뉴 */
export function AdminMobileHeader({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 h-12 px-4 bg-canvas-0/90 backdrop-blur border-b border-border lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="메뉴 열기"
          className="inline-flex items-center justify-center h-9 w-9 -ml-2 rounded-md text-ink-700 hover:bg-canvas-100 outline-none"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>예견 관리자</SheetTitle>
            {displayName && <div className="text-xs text-ink-500">{displayName}</div>}
          </SheetHeader>
          <nav className="flex-1 px-2 space-y-0.5 overflow-auto">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="px-4 py-4 border-t border-border">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
            >
              ← 서비스로 돌아가기
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <span className="text-sm font-semibold text-ink-900">예견 관리자</span>
    </header>
  )
}
