import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await adminSupabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    let query = adminSupabase
      .from('point_transactions')
      .select(
        `id, type, amount, balance, note, created_at,
         user:users!user_id(id, username, display_name)`,
        { count: 'exact' }
      )

    if (type !== 'all') {
      query = query.eq('type', type)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const [{ data, error, count }, todayBonusResult, todayBetsResult] = await Promise.all([
      query,
      adminSupabase
        .from('point_transactions')
        .select('amount')
        .eq('type', 'signup_bonus')
        .gte('created_at', todayISO),
      adminSupabase
        .from('point_transactions')
        .select('amount')
        .eq('type', 'bet_placed')
        .gte('created_at', todayISO),
    ])

    if (error) {
      return NextResponse.json({ success: false, error: '포인트 내역 조회 실패' }, { status: 500 })
    }

    const todayBonusTotal = (todayBonusResult.data ?? []).reduce(
      (sum: number, tx: { amount: number }) => sum + tx.amount,
      0
    )
    const todayBetsTotal = (todayBetsResult.data ?? []).reduce(
      (sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount),
      0
    )

    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: {
        total: count ?? 0,
        page,
        limit,
        hasMore: (count ?? 0) > offset + limit,
        todayBonusTotal,
        todayBetsTotal,
      },
    })
  } catch (err) {
    console.error('admin points GET error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
