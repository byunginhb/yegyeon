import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(200).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: '입력값이 올바르지 않습니다', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 내용이 없습니다' }, { status: 400 })
  }

  // username 중복 확인
  if (updates.username) {
    const { data: existing } = await adminSupabase
      .from('users')
      .select('id')
      .eq('username', updates.username)
      .neq('auth_id', authUser.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 유저네임입니다' },
        { status: 409 }
      )
    }
  }

  const { data, error } = await adminSupabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('auth_id', authUser.id)
    .select('id, username, display_name, bio')
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: '설정 업데이트에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
