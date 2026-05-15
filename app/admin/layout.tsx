import { redirect } from 'next/navigation'
import Link from 'next/link'
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
  type LucideIcon,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await adminSupabase
    .from('users')
    .select('role, display_name')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex bg-canvas-100">
      {/* 사이드바 */}
      <aside className="w-56 shrink-0 bg-canvas-0 border-r border-border flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <div className="text-sm font-semibold text-ink-900">예견 관리자</div>
          <div className="text-xs text-ink-500 mt-0.5">{profile.display_name}</div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <Link
            href="/"
            className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
          >
            ← 서비스로 돌아가기
          </Link>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
