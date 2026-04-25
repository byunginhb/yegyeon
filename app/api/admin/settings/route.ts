import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

export async function GET() {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await adminSupabase
    .from('service_settings')
    .select('*')
    .order('key', { ascending: true })

  if (error) {
    console.error('admin settings GET error', error)
    return NextResponse.json({ success: false, error: '설정 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  let body: { updates?: Array<{ key: string; value: string }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
  }

  const { updates } = body
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ success: false, error: '업데이트 항목이 없습니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const results: Array<{ key: string; success: boolean }> = []

  for (const item of updates) {
    if (!item.key || typeof item.value !== 'string') {
      results.push({ key: item.key ?? 'unknown', success: false })
      continue
    }

    const { data: before } = await adminSupabase
      .from('service_settings')
      .select('*')
      .eq('key', item.key)
      .single()

    if (!before) {
      results.push({ key: item.key, success: false })
      continue
    }

    const { data: after, error } = await adminSupabase
      .from('service_settings')
      .update({ value: item.value, updated_by: ctx.adminUserId, updated_at: now })
      .eq('key', item.key)
      .select('*')
      .single()

    if (error || !after) {
      results.push({ key: item.key, success: false })
      continue
    }

    await recordAdminLog({
      adminId: ctx.adminUserId,
      action: 'update_setting',
      targetType: 'setting',
      targetId: item.key,
      before,
      after,
    })

    results.push({ key: item.key, success: true })
  }

  return NextResponse.json({ success: true, data: results })
}
