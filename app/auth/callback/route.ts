import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

function safeNextPath(input: string | null): string {
  if (!input) return '/'
  // 외부 리다이렉트 차단: 반드시 / 로 시작하고 // 또는 \\ 로 시작하지 않음
  if (!input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) {
    return '/'
  }
  // 절대 URL 시도 차단 (예: /https://evil.com)
  if (/^\/[a-z]+:/i.test(input)) return '/'
  return input
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 안드로이드 앱 로그인(Custom Tab): 세션을 앱에 넘긴다. 앱은 refresh token을 /auth/app-session 에 POST 해 WebView 쿠키로 바꾼다.
      if (request.cookies.get('yg_app')?.value === '1' && data.session) {
        const res = NextResponse.redirect(
          `yegyeon://auth?rt=${encodeURIComponent(data.session.refresh_token)}`
        )
        res.cookies.delete('yg_app')
        return res
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
