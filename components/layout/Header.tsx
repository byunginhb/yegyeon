'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Search, Menu } from 'lucide-react'
import PointsDisplay from '@/components/ui/PointsDisplay'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/types'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser(authUserId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .maybeSingle()
      if (error) {
        console.error('Header user fetch error:', error)
        return
      }
      if (data) setUser(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (session?.user) {
          loadUser(session.user.id)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-canvas-0/95 backdrop-blur supports-[backdrop-filter]:bg-canvas-0/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="예견" width={28} height={28} className="rounded-sm" />
            <span className="font-bold text-lg text-ink-1000">예견</span>
          </Link>

          {/* 데스크탑 네비 */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            <Link href="/browse">
              <Button variant="ghost" size="sm" className="text-ink-700 hover:text-ink-1000">
                탐색
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-ink-700 hover:text-ink-1000">
                랭킹
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost" size="sm" className="text-ink-700 hover:text-ink-1000">
                소개
              </Button>
            </Link>
          </nav>

          <div className="flex-1" />

          {/* 검색 */}
          <Link href="/browse" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-canvas-50 border border-ink-200 text-ink-500 text-sm hover:border-primary/50 transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span>마켓 검색...</span>
          </Link>

          {/* 다크모드 토글 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="shrink-0"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* 유저 메뉴 */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* 포인트 */}
              <span className="hidden sm:flex items-center gap-1 text-sm font-medium text-ink-700 bg-canvas-50 px-2.5 py-1 rounded-full border border-ink-200">
                <PointsDisplay amount={user.points} size="sm" />
              </span>

              <Link href="/market/create">
                <Button size="sm" className="hidden sm:flex">마켓 만들기</Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {user.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.display_name}</p>
                    <p className="text-xs text-ink-500"><PointsDisplay amount={user.points} size="xs" showLabel /></p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/profile/${user.username}`)}>
                    내 프로필
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/portfolio')}>
                    포트폴리오
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/market/create')}>
                    마켓 만들기
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/admin')}>
                        관리자 페이지
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-scarlet-500">
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">가입하기</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
