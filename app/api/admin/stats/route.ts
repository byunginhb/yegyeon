import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const user = await verifyAdmin()
    if (!user) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const [
      { count: totalUsers },
      { count: todayUsers },
      { count: totalMarkets },
      { count: activeMarkets },
      todayBetsResult,
      pointsResult,
      recentUsersResult,
      recentMarketsResult,
    ] = await Promise.all([
      adminSupabase.from('users').select('*', { count: 'exact', head: true }),
      adminSupabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      adminSupabase.from('markets').select('*', { count: 'exact', head: true }),
      adminSupabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      adminSupabase
        .from('point_transactions')
        .select('amount')
        .eq('type', 'bet_placed')
        .gte('created_at', todayISO),
      adminSupabase
        .from('users')
        .select('points'),
      adminSupabase
        .from('users')
        .select('id, username, display_name, email, created_at, role')
        .order('created_at', { ascending: false })
        .limit(5),
      adminSupabase
        .from('markets')
        .select('id, title, type, status, total_volume, created_at, creator:users!creator_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const todayBettingVolume = (todayBetsResult.data ?? []).reduce(
      (sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount),
      0
    )
    const totalPointsCirculation = (pointsResult.data ?? []).reduce(
      (sum: number, u: { points: number }) => sum + u.points,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers ?? 0,
        todayUsers: todayUsers ?? 0,
        totalMarkets: totalMarkets ?? 0,
        activeMarkets: activeMarkets ?? 0,
        todayBettingVolume,
        totalPointsCirculation,
        recentUsers: recentUsersResult.data ?? [],
        recentMarkets: recentMarketsResult.data ?? [],
      },
    })
  } catch (err) {
    console.error('admin stats error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
