import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

const VALID_TYPE = ['banner', 'popup'] as const

export async function GET() {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await adminSupabase
    .from('announcements')
    .select(
      `id, title, content, type, is_active, starts_at, ends_at, created_at,
       creator:users!created_by(id, username, display_name)`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('admin announcements GET error', error)
    return NextResponse.json({ success: false, error: '공지 목록 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  let body: {
    title?: string
    content?: string
    type?: string
    is_active?: boolean
    starts_at?: string | null
    ends_at?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { title, content, type, is_active, starts_at, ends_at } = body
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ success: false, error: '제목과 내용은 필수입니다.' }, { status: 400 })
  }
  const safeType = type && VALID_TYPE.includes(type as (typeof VALID_TYPE)[number]) ? type : 'banner'

  const { data, error } = await adminSupabase
    .from('announcements')
    .insert({
      title: title.trim(),
      content: content.trim(),
      type: safeType,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
      created_by: ctx.adminUserId,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('admin announcements POST error', error)
    return NextResponse.json({ success: false, error: '공지 생성 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'create_announcement',
    targetType: 'announcement',
    targetId: data.id,
    after: data,
  })

  return NextResponse.json({ success: true, data })
}
