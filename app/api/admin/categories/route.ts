import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

export async function GET() {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await adminSupabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('admin categories GET error', error)
    return NextResponse.json({ success: false, error: '카테고리 목록 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
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

  const { name, slug, icon, color, sort_order, is_active } = body
  if (!name?.trim() || !slug?.trim() || !icon?.trim() || !color?.trim()) {
    return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const insertPayload = {
    name: name.trim(),
    slug: slug.trim(),
    icon: icon.trim(),
    color: color.trim(),
    sort_order: typeof sort_order === 'number' ? sort_order : 0,
    is_active: typeof is_active === 'boolean' ? is_active : true,
  }

  const { data, error } = await adminSupabase
    .from('categories')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    console.error('admin categories POST error', error)
    const message = error?.code === '23505' ? '이미 존재하는 슬러그입니다.' : '카테고리 생성 실패'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }

  await recordAdminLog({
    adminId: ctx.adminUserId,
    action: 'create_category',
    targetType: 'category',
    targetId: String(data.id),
    after: data,
  })

  return NextResponse.json({ success: true, data })
}
