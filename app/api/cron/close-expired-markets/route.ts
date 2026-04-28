import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

// Vercel Cron이 Authorization: Bearer <CRON_SECRET> 헤더를 전송
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data, error } = await adminSupabase
    .from('markets')
    .update({ status: 'closed', updated_at: now })
    .eq('status', 'open')
    .lt('close_date', now)
    .select('id, title')

  if (error) {
    console.error('close-expired-markets cron error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const closed = data ?? []
  console.log(`[cron] close-expired-markets: ${closed.length}개 마감`, closed.map((m) => m.id))

  return NextResponse.json({ success: true, closed: closed.length })
}
