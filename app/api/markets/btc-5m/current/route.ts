import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sidePrice } from '@/lib/btc5m'

export const dynamic = 'force-dynamic'

// 비트코인 5분 등락 위젯용 — 현재 라운드 + 가격 샘플(라운드 흐름) + 동적 배당 + 직전 결과
// 관리자 전용(베타). 가격은 서버 샘플러(10초)가 적재한 최신 샘플에서 도출 → 폴링마다 업비트 호출 없음.
export async function GET() {
  // 관리자 가드
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }
  const { data: me } = await adminSupabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()
  if (me?.role !== 'admin') {
    return NextResponse.json({ success: false, error: '관리자 전용 베타 기능입니다.' }, { status: 403 })
  }

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

  return NextResponse.json({
    success: true,
    data: {
      round: round
        ? { ...round, current_price: currentPrice, up_price: upPrice, down_price: downPrice, samples }
        : null,
      last: last ?? null,
    },
  })
}
