import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')

  if (!user_id) {
    return NextResponse.json({ success: false, error: 'user_id가 필요합니다' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ success: true, data: { following: false } })
  }

  const { data: dbUser } = await adminSupabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()

  if (!dbUser) {
    return NextResponse.json({ success: true, data: { following: false } })
  }

  const { data } = await adminSupabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', dbUser.id)
    .eq('following_id', user_id)
    .maybeSingle()

  return NextResponse.json({ success: true, data: { following: !!data } })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await request.json()
  const { target_user_id } = body

  if (!target_user_id) {
    return NextResponse.json({ success: false, error: 'target_user_id가 필요합니다' }, { status: 400 })
  }

  const { data: dbUser, error: userError } = await adminSupabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다' }, { status: 404 })
  }

  if (dbUser.id === target_user_id) {
    return NextResponse.json({ success: false, error: '자기 자신을 팔로우할 수 없습니다' }, { status: 400 })
  }

  // 이미 팔로우 중인지 확인
  const { data: existing } = await adminSupabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', dbUser.id)
    .eq('following_id', target_user_id)
    .maybeSingle()

  if (existing) {
    // 언팔로우
    await adminSupabase
      .from('follows')
      .delete()
      .eq('follower_id', dbUser.id)
      .eq('following_id', target_user_id)

    return NextResponse.json({ success: true, data: { following: false } })
  }

  // 팔로우
  const { error } = await adminSupabase
    .from('follows')
    .insert({ follower_id: dbUser.id, following_id: target_user_id })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { following: true } })
}
