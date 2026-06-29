import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { triggerQuestComplete } from '@/lib/quest'

const BetSchema = z.object({
  market_id: z.string().uuid('마켓 ID가 잘못되었습니다.'),
  outcome: z.string().min(1).max(200),
  option_id: z.string().uuid().nullable().optional(),
  amount: z.number().int().positive().max(1_000_000),
})

const RPC_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  INVALID_AMOUNT: { status: 400, message: '예측 금액이 유효하지 않습니다.' },
  BELOW_MIN_BET: { status: 400, message: '최소 예측 금액 미만입니다.' },
  USER_NOT_FOUND: { status: 404, message: '사용자 프로필을 찾을 수 없습니다.' },
  USER_BANNED: { status: 403, message: '정지된 계정입니다.' },
  INSUFFICIENT_POINTS: { status: 400, message: '포인트가 부족합니다.' },
  MARKET_NOT_FOUND: { status: 404, message: '마켓을 찾을 수 없습니다.' },
  MARKET_CLOSED: { status: 400, message: '이미 마감된 마켓입니다.' },
  INVALID_OUTCOME: { status: 400, message: '잘못된 예측 결과입니다.' },
  OPTION_REQUIRED: { status: 400, message: '옵션을 선택해주세요.' },
  INVALID_OPTION: { status: 400, message: '잘못된 옵션입니다.' },
  INVALID_NUMERIC: { status: 400, message: '숫자 값이 잘못되었습니다.' },
}

function mapRpcError(message: string | undefined): { status: number; error: string } {
  if (!message) return { status: 500, error: '서버 오류가 발생했습니다.' }
  for (const [code, info] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(code)) return { status: info.status, error: info.message }
  }
  return { status: 500, error: '예측 처리에 실패했습니다.' }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = BetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }

    const { market_id, outcome, option_id, amount } = parsed.data

    const { data, error } = await adminSupabase.rpc('place_bet', {
      p_auth_id: authUser.id,
      p_market_id: market_id,
      p_outcome: outcome,
      p_option_id: option_id ?? null,
      p_amount: amount,
    })

    if (error) {
      const mapped = mapRpcError(error.message)
      console.error('place_bet RPC error', { code: error.code, message: error.message })
      return NextResponse.json({ success: false, error: mapped.error }, { status: mapped.status })
    }

    // 예측 성공 — daily_bet 퀘스트 자동 완료 (실패해도 본 동작에 영향 없음)
    try {
      const { data: dbUser } = await adminSupabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single()
      if (dbUser?.id) {
        await triggerQuestComplete(dbUser.id, 'daily_bet')
      }
    } catch (e) {
      console.error('daily_bet quest trigger failed', e)
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('bets POST error:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
