import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { sidePrice } from '@/lib/btc5m'

// 비트코인 5분 등락 위젯용 — 현재 라운드 + 가격 샘플(라운드 흐름) + 동적 배당 + 직전 결과
// CDN 엣지 캐시(약 8초)로 Vercel 함수 호출을 캐시 주기당 1회로 고정(뷰어 수·폴링 빈도 무관).
// 노출 데이터는 공개 시세/라운드 정보뿐이라 공개 읽기. 위젯은 페이지에서 관리자에게만 렌더되고,
// 실제 베팅(/bet)은 별도 관리자 가드를 유지한다.
const CACHE_CONTROL = 'public, s-maxage=8, stale-while-revalidate=20'

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

  let currentPrice: number | null = null
  let upPrice: number | null = null
  let downPrice: number | null = null
  let samples: { t: number; p: number }[] = []

  if (round?.open_price != null) {
    const startTs = new Date(round.close_date).getTime() - 300000
    const { data: rows } = await adminSupabase
      .from('btc_price_samples')
      .select('price, sampled_at')
      .eq('market_id', round.id)
      .gte('sampled_at', new Date(startTs).toISOString())
      .order('sampled_at', { ascending: true })
    samples = (rows ?? []).map((r) => ({
      t: new Date(r.sampled_at as string).getTime(),
      p: Number(r.price),
    }))

    // 현재가 = 최신 샘플(최대 10초 전) ?? 시작가. 베팅 가격은 /bet이 라이브로 재확정.
    currentPrice = samples.length ? samples[samples.length - 1].p : Number(round.open_price)
    const secondsRemaining = Math.max(0, (new Date(round.close_date).getTime() - Date.now()) / 1000)
    upPrice = sidePrice('YES', currentPrice, Number(round.open_price), secondsRemaining)
    downPrice = sidePrice('NO', currentPrice, Number(round.open_price), secondsRemaining)
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        round: round
          ? { ...round, current_price: currentPrice, up_price: upPrice, down_price: downPrice, samples }
          : null,
        last: last ?? null,
      },
    },
    { headers: { 'Cache-Control': CACHE_CONTROL } }
  )
}
