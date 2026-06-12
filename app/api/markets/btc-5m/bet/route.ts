import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { fetchBtcKrw } from '@/lib/btc-price'
import { sidePrice } from '@/lib/btc5m'

const BetSchema = z.object({
  market_id: z.string().uuid(),
  outcome: z.enum(['YES', 'NO']),
  amount: z.number().int().positive().max(1_000_000),
})

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  INVALID_AMOUNT: { status: 400, message: '베팅 금액이 유효하지 않습니다.' },
  BELOW_MIN_BET: { status: 400, message: '최소 베팅 금액 미만입니다.' },
  USER_NOT_FOUND: { status: 404, message: '사용자 정보를 찾을 수 없습니다.' },
  USER_BANNED: { status: 403, message: '정지된 계정입니다.' },
  INSUFFICIENT_POINTS: { status: 400, message: '포인트가 부족합니다.' },
  MARKET_NOT_FOUND: { status: 404, message: '라운드를 찾을 수 없습니다.' },
  NOT_BTC5M: { status: 400, message: '잘못된 마켓입니다.' },
  MARKET_CLOSED: { status: 400, message: '이번 라운드는 마감됐습니다.' },
  INVALID_OUTCOME: { status: 400, message: '잘못된 방향입니다.' },
}

function mapRpcError(message: string | undefined): { status: number; error: string } {
  if (message) {
    for (const [code, info] of Object.entries(RPC_ERRORS)) {
      if (message.includes(code)) return { status: info.status, error: info.message }
    }
  }
  return { status: 500, error: '베팅 처리에 실패했습니다.' }
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
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }
    const parsed = BetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }
    const { market_id, outcome, amount } = parsed.data

    // 라운드 검증 + 시작가/마감시각 조회
    const { data: round } = await adminSupabase
      .from('markets')
      .select('id, open_price, close_date, status, auto_kind')
      .eq('id', market_id)
      .single()

    if (!round || round.auto_kind !== 'btc_5m') {
      return NextResponse.json({ success: false, error: '잘못된 마켓입니다.' }, { status: 400 })
    }
    if (round.status !== 'open' || new Date(round.close_date).getTime() <= Date.now()) {
      return NextResponse.json({ success: false, error: '이번 라운드는 마감됐습니다.' }, { status: 400 })
    }

    // 라이브 BTC가 → 서버에서 베팅 가격 확정(클라이언트 신뢰 안 함)
    const currentPrice = await fetchBtcKrw()
    if (currentPrice == null || round.open_price == null) {
      return NextResponse.json(
        { success: false, error: '실시간 시세를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      )
    }
    const secondsRemaining = Math.max(
      0,
      (new Date(round.close_date).getTime() - Date.now()) / 1000
    )
    const price = sidePrice(outcome, currentPrice, Number(round.open_price), secondsRemaining)

    const { data, error } = await adminSupabase.rpc('place_btc5m_bet', {
      p_auth_id: authUser.id,
      p_market_id: market_id,
      p_outcome: outcome,
      p_amount: amount,
      p_price: price,
    })

    if (error) {
      const mapped = mapRpcError(error.message)
      console.error('place_btc5m_bet error', { code: error.code, message: error.message })
      return NextResponse.json({ success: false, error: mapped.error }, { status: mapped.status })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('btc-5m bet error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
