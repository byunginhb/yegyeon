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

  return NextResponse.json({
    success: true,
    data: { round: round ?? null, last: last ?? null },
  })
}
