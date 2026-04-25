import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ success: false, error: '잘못된 카테고리 ID' }, { status: 400 })
  }

  let body: {
    name?: string
    slug?: string
    icon?: string
    color?: string
    sort_order?: number
    is_active?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { data: before, error: beforeError } = await adminSupabase
    .from('categories')
    .select('*')
    .eq('id', numericId)
    .single()

  if (beforeError || !before) {
    return NextResponse.json({ success: false, error: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (typeof body.name === 'string') updatePayload.name = body.name.trim()
  if (typeof body.slug === 'string') updatePayload.slug = body.slug.trim()
  if (typeof body.icon === 'string') updatePayload.icon = body.icon.trim()
  if (typeof body.color === 'string') updatePayload.color = body.color.trim()
  if (typeof body.sort_order === 'number') updatePayload.sort_order = body.sort_order
  if (typeof body.is_active === 'boolean') updatePayload.is_active = body.is_active

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  const { data: after, error } = await adminSupabase
    .from('categories')
    .update(updatePayload)
    .eq('id', numericId)
    .select('*')
    .single()

  if (error || !after) {
    console.error('admin category PATCH error', error)
    const message = error?.code === '23505' ? '이미 존재하는 슬러그입니다.' : '카테고리 수정 실패'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'update_category',
    targetType: 'category',
    targetId: String(numericId),
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
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ success: false, error: '잘못된 카테고리 ID' }, { status: 400 })
  }

  const { data: before } = await adminSupabase
    .from('categories')
    .select('*')
    .eq('id', numericId)
    .single()

  const { error } = await adminSupabase.from('categories').delete().eq('id', numericId)

  if (error) {
    console.error('admin category DELETE error', error)
    return NextResponse.json({ success: false, error: '카테고리 삭제 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'delete_category',
    targetType: 'category',
    targetId: String(numericId),
    before: before ?? null,
  })

  return NextResponse.json({ success: true })
}
