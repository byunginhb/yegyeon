import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { fetchBtcKrwCached } from '@/lib/btc-price'
import { sidePrice } from '@/lib/btc5m'

export const dynamic = 'force-dynamic'

// 비트코인 5분 등락 위젯용 — 현재 라운드 + 라이브 가격 + 동적 배당(양쪽 가격) + 직전 결과
export async function GET() {
  const { data: round } = await adminSupabase
    .from('markets')
    .select('id, title, open_price, close_date, yes_amount, no_amount, unique_traders')
    .eq('auto_kind', 'btc_5m')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: last } = await adminSupabase
    .from('markets')
    .select('id, resolution, open_price, close_price, resolved_at')
    .eq('auto_kind', 'btc_5m')
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 라이브 BTC 현재가 → 양쪽 베팅 가격(=확률+vig) 산정
  let currentPrice: number | null = null
  let upPrice: number | null = null
  let downPrice: number | null = null
  if (round?.open_price != null) {
    currentPrice = await fetchBtcKrwCached()
    if (currentPrice != null) {
      const secondsRemaining = Math.max(
        0,
        (new Date(round.close_date).getTime() - Date.now()) / 1000
      )
      upPrice = sidePrice('YES', currentPrice, Number(round.open_price), secondsRemaining)
      downPrice = sidePrice('NO', currentPrice, Number(round.open_price), secondsRemaining)
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      round: round
        ? { ...round, current_price: currentPrice, up_price: upPrice, down_price: downPrice }
        : null,
      last: last ?? null,
    },
  })
}
