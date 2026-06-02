import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 30

// 헤더 아래 marquee용 인기 마켓. total_volume 내림차순으로 가져와 상위 일부는 isHot 마킹.
export async function GET() {
  const { data, error } = await adminSupabase
    .from('markets')
    .select('id, title, thumbnail_url, total_volume, unique_traders, type')
    .eq('status', 'open')
    .eq('is_hidden', false)
    .order('total_volume', { ascending: false })
    .order('unique_traders', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    id: string
    title: string
    thumbnail_url: string | null
    total_volume: number
    unique_traders: number
    type: string
  }>

  // 상위 3개를 hot으로 마킹. 단, total_volume이 0인 경우 hot 제외.
  const items = rows.map((m, idx) => ({
    id: m.id,
    title: m.title,
    thumbnailUrl: m.thumbnail_url,
    totalVolume: m.total_volume,
    uniqueTraders: m.unique_traders,
    isHot: idx < 3 && m.total_volume > 0,
  }))

  return NextResponse.json({ success: true, data: items })
}
