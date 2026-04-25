import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

const VALID_STATUS = ['pending', 'reviewed', 'resolved', 'dismissed'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: string; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { status, note } = body

  if (status && !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({ success: false, error: '유효하지 않은 상태값입니다.' }, { status: 400 })
  }

  const { data: before, error: beforeError } = await adminSupabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (beforeError || !before) {
    return NextResponse.json({ success: false, error: '신고를 찾을 수 없습니다.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {
    reviewed_by: ctx.adminUserId,
    reviewed_at: new Date().toISOString(),
  }
  if (status) updatePayload.status = status
  if (typeof note === 'string') updatePayload.note = note

  const { data: after, error } = await adminSupabase
    .from('reports')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !after) {
    console.error('admin reports PATCH error', error)
    return NextResponse.json({ success: false, error: '신고 처리 실패' }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: status ? `report_${status}` : 'update_report',
    targetType: 'report',
    targetId: id,
    before,
    after,
  })

  return NextResponse.json({ success: true, data: after })
}
