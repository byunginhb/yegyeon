import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 내부 users 테이블에서 사용자 조회
    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id, points, display_name')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 베팅 목록 조회 (마켓 정보 포함)
    const { data: bets, error: betsError } = await adminSupabase
      .from('bets')
      .select(`
        id, market_id, outcome, amount, shares, payout, probability_at_bet, created_at,
        market:markets!market_id(id, title, slug, status, type, yes_probability, resolution, close_date)
      `)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })

    if (betsError) {
      return NextResponse.json(
        { success: false, error: '베팅 목록을 불러오는 데 실패했습니다.' },
        { status: 500 }
      )
    }

    interface BetRow {
      id: string
      market_id: string
      outcome: string
      amount: number
      shares: number
      payout: number | null
      market: { status: string; type: string; yes_probability: number; resolution: string | null } | null
    }

    const allBets = (bets ?? []) as unknown as BetRow[]

    // 진행 중 베팅 / 완료된 베팅 분류
    const activeBets = allBets.filter((b) => {
      return b.market?.status === 'open' || b.market?.status === 'closed'
    })

    const resolvedBets = allBets.filter((b) => {
      return b.market?.status === 'resolved' || b.market?.status === 'cancelled'
    })

    // 통계 계산
    const totalBetAmount = allBets.reduce((sum, b) => sum + b.amount, 0)
    const totalPayout = resolvedBets.reduce((sum, b) => sum + (b.payout ?? 0), 0)
    const netProfit = totalPayout - resolvedBets.reduce((sum, b) => sum + b.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          points: dbUser.points,
          display_name: dbUser.display_name,
        },
        stats: {
          total_bets: allBets.length,
          total_bet_amount: totalBetAmount,
          total_payout: totalPayout,
          net_profit: netProfit,
        },
        active_bets: activeBets,
        resolved_bets: resolvedBets,
      },
    })
  } catch (err) {
    console.error('portfolio GET error:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
