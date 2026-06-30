'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, LogOut, User as UserIcon, Briefcase, Shield } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/types'

/**
 * 모바일 전용 상단 바 (lg 미만에서만 노출).
 * 로고 + 테마 토글 + 유저 메뉴(아바타 드롭다운).
 * lg+ 데스크탑은 LeftSidebar가 같은 역할을 한다.
 */
export default function MobileTopBar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    async function loadUser(authUserId: string) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .maybeSingle()
      if (data) setUser(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setUser(null)
      else if (session?.user) loadUser(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-12 px-4 bg-canvas-100/85 backdrop-blur border-b border-ink-200/40 lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="예견" width={26} height={26} className="rounded-md" />
        <span className="font-bold text-base text-ink-1000 tracking-tight">예견</span>
      </Link>

      <div className="flex items-center gap-1">
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-ink-600 hover:bg-canvas-0/60 hover:text-ink-900 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        )}

        {mounted && (user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center rounded-full outline-none"
              aria-label="사용자 메뉴"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {user.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/profile/${user.username}`)}>
                <UserIcon className="h-4 w-4" />
                프로필
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/portfolio')}>
                <Briefcase className="h-4 w-4" />
                포트폴리오
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/admin')}>
                  <Shield className="h-4 w-4" />
                  관리자 페이지
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-scarlet-600 focus:text-scarlet-700 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex items-center h-8 px-3 rounded-full text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            로그인 / 가입
          </Link>
        ))}
      </div>
    </header>
  )
}
