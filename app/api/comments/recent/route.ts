import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 30

// 사이트 전체의 최근 댓글 — 사이드바 ticker용
// 공개 가능한 모든 마켓(open/closed/resolved) 댓글을 노출.
// 숨김(is_hidden)·심사중(pending)·거절(rejected)·취소(cancelled)는 제외.
const VISIBLE_STATUSES = new Set(['open', 'closed', 'resolved'])

export async function GET() {
  const { data, error } = await adminSupabase
    .from('comments')
    .select(`
      id, market_id, content, created_at,
      user:users!user_id(display_name, avatar_url),
      market:markets!market_id(id, title, status, is_hidden)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  type Row = {
    id: string
    market_id: string
    content: string
    created_at: string
    user: { display_name: string; avatar_url: string | null } | null
    market: { id: string; title: string; status: string; is_hidden: boolean } | null
  }

  const filtered = ((data ?? []) as unknown as Row[])
    .filter((r) => r.market && !r.market.is_hidden && VISIBLE_STATUSES.has(r.market.status))
    .slice(0, 25)
    .map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      marketId: r.market!.id,
      marketTitle: r.market!.title,
      userName: r.user?.display_name ?? '익명',
      userAvatar: r.user?.avatar_url ?? null,
    }))

  return NextResponse.json({ success: true, data: filtered })
}
