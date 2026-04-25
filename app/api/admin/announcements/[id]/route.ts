import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

const VALID_TYPE = ['banner', 'popup'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

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

  const { data: before, error: beforeError } = await adminSupabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (beforeError || !before) {
    return NextResponse.json({ success: false, error: '공지를 찾을 수 없습니다.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (typeof body.title === 'string') updatePayload.title = body.title.trim()
  if (typeof body.content === 'string') updatePayload.content = body.content.trim()
  if (body.type && VALID_TYPE.includes(body.type as (typeof VALID_TYPE)[number])) {
    updatePayload.type = body.type
  }
  if (typeof body.is_active === 'boolean') updatePayload.is_active = body.is_active
  if (body.starts_at !== undefined) updatePayload.starts_at = body.starts_at || null
  if (body.ends_at !== undefined) updatePayload.ends_at = body.ends_at || null

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  const { data: after, error } = await adminSupabase
    .from('announcements')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !after) {
    console.error('admin announcement PATCH error', error)
    return NextResponse.json({ success: false, error: '공지 수정 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'update_announcement',
    targetType: 'announcement',
    targetId: id,
    before,
    after,
  })

  return NextResponse.json({ success: true, data: after })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const { data: before } = await adminSupabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await adminSupabase.from('announcements').delete().eq('id', id)

  if (error) {
    console.error('admin announcement DELETE error', error)
    return NextResponse.json({ success: false, error: '공지 삭제 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'delete_announcement',
    targetType: 'announcement',
    targetId: id,
    before: before ?? null,
  })

  return NextResponse.json({ success: true })
}
