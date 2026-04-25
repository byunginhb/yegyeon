import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from('categories')
      .select('id, name, slug, icon, color, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: '카테고리를 불러오는 데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
