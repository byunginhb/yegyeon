import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/admin-log'

export async function GET() {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await adminSupabase
    .from('legal_documents')
    .select('id, kind, title, content, version, updated_at, updated_by')
    .order('kind', { ascending: true })

  if (error) {
    console.error('admin legal GET error', error)
    return NextResponse.json({ success: false, error: '약관 조회 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}
