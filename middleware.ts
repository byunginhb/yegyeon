import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_REQUIRED = ['/portfolio', '/market/create', '/settings']
const ADMIN_REQUIRED = ['/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // 로그인 필요 라우트
  if (AUTH_REQUIRED.some(p => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 관리자 전용 라우트
  if (ADMIN_REQUIRED.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  // 미들웨어의 유일한 역할은 보호 라우트 리다이렉트 게이트다.
  // 이전에는 거의 모든 요청(홈·마켓·API·정적자산 포함)에 매칭돼
  // 매 요청마다 supabase.auth.getUser()가 실행 → Auth /user 호출이 폭주했다.
  // 실제로 보호가 필요한 경로만 매칭해 불필요한 인증 왕복을 제거한다.
  matcher: [
    '/portfolio/:path*',
    '/market/create/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}
