import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/admin-log'

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('markets')
      .select(
        `id, title, type, status, total_volume, close_date, created_at, auto_kind,
         creator:users!creator_id(id, username, display_name)`,
        { count: 'exact' }
      )

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 사용자 마켓만 노출 (자동 마켓 기능 제거됨 — auto_kind는 항상 null)
    query = query.is('auto_kind', null)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ success: false, error: '마켓 목록 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: { total: count ?? 0, page, limit, hasMore: (count ?? 0) > offset + limit },
    })
  } catch (err) {
    console.error('admin markets GET error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
