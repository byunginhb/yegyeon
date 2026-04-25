import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const VALID_TYPE = ['market', 'comment', 'user'] as const
type ReportType = (typeof VALID_TYPE)[number]

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { type?: string; target_id?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { type, target_id, reason } = body
  if (!type || !VALID_TYPE.includes(type as ReportType)) {
    return NextResponse.json({ success: false, error: '유효하지 않은 신고 타입' }, { status: 400 })
  }
  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ success: false, error: '신고 대상이 필요합니다.' }, { status: 400 })
  }
  if (!reason?.trim() || reason.trim().length < 5) {
    return NextResponse.json({ success: false, error: '신고 사유는 최소 5자 이상' }, { status: 400 })
  }

  const { data: profile } = await adminSupabase
    .from('users')
    .select('id, is_banned')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ success: false, error: '유저 프로필을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (profile.is_banned) {
    return NextResponse.json({ success: false, error: '정지된 계정은 신고할 수 없습니다.' }, { status: 403 })
  }

  // 자기 자신 신고 차단
  if (type === 'user' && target_id === profile.id) {
    return NextResponse.json({ success: false, error: '본인은 신고할 수 없습니다.' }, { status: 400 })
  }

  // 신고 대상 실재 검증
  const targetTable = type === 'market' ? 'markets' : type === 'comment' ? 'comments' : 'users'
  const { data: targetExists } = await adminSupabase
    .from(targetTable)
    .select('id')
    .eq('id', target_id)
    .maybeSingle()
  if (!targetExists) {
    return NextResponse.json({ success: false, error: '신고 대상을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 본인 작성 댓글/마켓 신고 차단
  if (type === 'comment' || type === 'market') {
    const { data: ownership } = await adminSupabase
      .from(targetTable)
      .select(type === 'comment' ? 'user_id' : 'creator_id')
      .eq('id', target_id)
      .maybeSingle()
    if (ownership) {
      const ownerId =
        type === 'comment'
          ? (ownership as { user_id: string }).user_id
          : (ownership as { creator_id: string }).creator_id
      if (ownerId === profile.id) {
        return NextResponse.json({ success: false, error: '본인 콘텐츠는 신고할 수 없습니다.' }, { status: 400 })
      }
    }
  }

  const { data: existing } = await adminSupabase
    .from('reports')
    .select('id')
    .eq('reporter_id', profile.id)
    .eq('type', type)
    .eq('target_id', target_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { success: false, error: '이미 신고하신 내용입니다. 관리자 검토를 기다려 주세요.' },
      { status: 409 }
    )
  }

  const { data, error } = await adminSupabase
    .from('reports')
    .insert({
      reporter_id: profile.id,
      type,
      target_id,
      reason: reason.trim(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('reports POST error', error)
    return NextResponse.json({ success: false, error: '신고 접수 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { id: data.id } })
}
