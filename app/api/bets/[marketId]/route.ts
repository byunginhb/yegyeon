import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ marketId: string }>
}

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { marketId } = await params

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
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 해당 마켓의 현재 유저 예측 목록 조회
    const { data: bets, error: betsError } = await adminSupabase
      .from('bets')
      .select('*')
      .eq('market_id', marketId)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })

    if (betsError) {
      return NextResponse.json(
        { success: false, error: '예측 목록을 불러오는 데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: bets ?? [],
    })
  } catch (err) {
    console.error('bets GET error:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
