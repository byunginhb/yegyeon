import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const revalidate = 60

export async function GET() {
  const now = new Date().toISOString()

  const { data, error } = await adminSupabase
    .from('announcements')
    .select('id, title, content, type, starts_at, ends_at, created_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('announcements GET error', error)
    return NextResponse.json({ success: false, error: '공지 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}
