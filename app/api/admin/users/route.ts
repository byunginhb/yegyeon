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
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('users')
      .select('id, username, display_name, email, points, role, created_at', { count: 'exact' })

    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ success: false, error: '유저 목록 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: { total: count ?? 0, page, limit, hasMore: (count ?? 0) > offset + limit },
    })
  } catch (err) {
    console.error('admin users GET error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
