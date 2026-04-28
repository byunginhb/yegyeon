import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/admin-log'

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
      { count: pendingMarkets },
      todayBetsResult,
      pointsResult,
      recentUsersResult,
      recentMarketsResult,
      pendingMarketsResult,
    ] = await Promise.all([
      adminSupabase.from('users').select('*', { count: 'exact', head: true }),
      adminSupabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      adminSupabase.from('markets').select('*', { count: 'exact', head: true }),
      adminSupabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      adminSupabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
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
      adminSupabase
        .from('markets')
        .select('id, title, type, created_at, creator:users!creator_id(username, display_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
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
        pendingMarkets: pendingMarkets ?? 0,
        todayBettingVolume,
        totalPointsCirculation,
        recentUsers: recentUsersResult.data ?? [],
        recentMarkets: recentMarketsResult.data ?? [],
        pendingMarketsList: pendingMarketsResult.data ?? [],
      },
    })
  } catch (err) {
    console.error('admin stats error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
