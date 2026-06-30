import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/admin-log'

export async function POST() {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { data, error } = await adminSupabase
      .from('markets')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('auto_kind', 'btc_5m')
      .eq('status', 'open')
      .select('id')

    if (error) {
      return NextResponse.json({ success: false, error: 'BTC 5분 마켓 일괄 중지 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, stopped: data?.length ?? 0 })
  } catch (err) {
    console.error('btc-5m stop error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
