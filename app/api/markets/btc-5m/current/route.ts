import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// 비트코인 5분 등락 위젯용 — 현재 진행 중인 라운드 + 직전 정산 결과
export async function GET() {
  // 1) 진행 중 라운드 (가장 최근 open)
  const { data: round } = await adminSupabase
    .from('markets')
    .select('id, title, open_price, close_date, yes_probability, yes_amount, no_amount, unique_traders')
    .eq('auto_kind', 'btc_5m')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 2) 직전 정산 결과 (가장 최근 resolved)
  const { data: last } = await adminSupabase
    .from('markets')
    .select('id, resolution, open_price, close_price, resolved_at')
    .eq('auto_kind', 'btc_5m')
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3) 현재 라운드의 방향별 shares 합 — 시간 감쇠 배당 미리보기 계산용
  //    (정산 분배는 shares 비례이므로 위젯이 예상 수령액을 정확히 계산하려면 필요)
  let yesShares = 0
  let noShares = 0
  if (round?.id) {
    const { data: bets } = await adminSupabase
      .from('bets')
      .select('outcome, shares')
      .eq('market_id', round.id)

    for (const b of bets ?? []) {
      const s = Number(b.shares) || 0
      if (String(b.outcome).toUpperCase() === 'YES') yesShares += s
      else noShares += s
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      round: round ? { ...round, yes_shares: yesShares, no_shares: noShares } : null,
      last: last ?? null,
    },
  })
}
