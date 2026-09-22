import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 안드로이드 앱 전용: Custom Tab에서 받은 refresh token을 WebView 세션 쿠키로 교환한다.
// refresh token은 1회용이라 URL 대신 body로 받는다.
export async function POST(request: Request) {
  const { refresh_token } = await request.json().catch(() => ({}))
  if (typeof refresh_token !== 'string' || !refresh_token) {
    return NextResponse.json({ error: 'refresh_token required' }, { status: 400 })
  }
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.refreshSession({ refresh_token })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })
  return NextResponse.json({ ok: true })
}
