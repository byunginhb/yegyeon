'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home, Search, PlusCircle, BarChart2, Briefcase,
  Moon, Sun, LogIn, LogOut, Shield,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import PointsDisplay from '@/components/ui/PointsDisplay'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CommentTicker from '@/components/marquee/CommentTicker'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

const NAV_ITEMS = [
  { href: '/',           icon: Home,       label: '홈',        exact: true },
  { href: '/browse',     icon: Search,     label: '탐색',      exact: false },
  { href: '/leaderboard',icon: BarChart2,  label: '랭킹',      exact: false },
  { href: '/portfolio',  icon: Briefcase,  label: '마이페이지', exact: false },
]

export default function LeftSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    async function loadUser(authUserId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .maybeSingle()
      if (error) {
        console.error('LeftSidebar user fetch error:', error)
        return
      }
      if (data) setUser(data)
    }

    // 즉시 1회: cookie에서 session 동기 조회 (네트워크 안 탐)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id)
    })

    // 인증 상태 변화 구독 (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, INITIAL_SESSION 모두 처리)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (session?.user) {
          loadUser(session.user.id)
        }
      }
    )

    // 예측/정산 등 외부에서 잔액 변동 시 즉시 반영
    function handleBalance(e: Event) {
      const detail = (e as CustomEvent<{ points: number }>).detail
      if (typeof detail?.points === 'number') {
        setUser((prev) => (prev ? { ...prev, points: detail.points } : prev))
      }
    }
    window.addEventListener('yegyeon:balance-updated', handleBalance)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('yegyeon:balance-updated', handleBalance)
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 pl-6 bg-transparent flex-col z-40 hidden lg:flex">
      {/* 로고 */}
      <div className="px-4 pt-5 pb-2">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="예견" width={34} height={34} className="rounded-xl" />
          <span className="font-bold text-xl text-ink-1000 tracking-tight">예견</span>
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="px-3 pt-2 pb-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-ink-700 hover:bg-canvas-0/60 hover:text-ink-900'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* 관리자 링크 (어드민만) */}
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-0/60 hover:text-ink-900 transition-colors"
          >
            <Shield className="h-[18px] w-[18px] shrink-0" />
            관리자
          </Link>
        )}

        {/* 마켓 만들기 — 강조 CTA */}
        <div className="pt-3">
          <Link
            href="/market/create"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-md shadow-indigo-500/20 transition-all"
          >
            <PlusCircle className="h-[18px] w-[18px] shrink-0" />
            마켓 만들기
          </Link>
        </div>
      </nav>

      {/* 실시간 댓글 ticker (남는 공간 채움) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CommentTicker />
      </div>

      {/* 약관 푸터 메뉴 */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-ink-400">
          <Link href="/legal/terms_of_service" className="hover:text-ink-700 transition-colors">
            서비스 약관
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/privacy_policy" className="hover:text-ink-700 transition-colors">
            개인정보 처리방침
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/terms_of_use" className="hover:text-ink-700 transition-colors">
            이용 약관
          </Link>
        </div>
      </div>

      {/* 하단: 다크모드 + 유저 */}
      <div className="px-3 py-3 space-y-1">
        {/* 다크모드 토글 */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink-600 hover:bg-canvas-100 hover:text-ink-900 w-full transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] shrink-0" />
            )}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
        )}

        {/* 유저 섹션 */}
        {user ? (
          <div>
            <Link
              href={`/profile/${user.username}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-canvas-100 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {user.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 truncate leading-tight">
                  {user.display_name}
                </p>
                <PointsDisplay amount={user.points} size="xs" />
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-500 hover:bg-canvas-100 hover:text-scarlet-500 w-full transition-colors mt-0.5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              로그아웃
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <LogIn className="h-[18px] w-[18px] shrink-0" />
            로그인 / 가입
          </Link>
        )}
      </div>
    </aside>
  )
}
