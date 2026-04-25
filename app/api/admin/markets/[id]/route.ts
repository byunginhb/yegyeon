import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await adminSupabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params

  const [{ data: market, error: marketError }, { data: bets }, { data: comments }] =
    await Promise.all([
      adminSupabase
        .from('markets')
        .select(
          `*,
           creator:users!creator_id(id, username, display_name, avatar_url),
           category:categories!category_id(id, name, slug, icon, color),
           options:market_options(id, text, color, probability, total_amount, sort_order)`
        )
        .eq('id', id)
        .single(),
      adminSupabase
        .from('bets')
        .select('id, outcome, amount, shares, payout, created_at, user:users!user_id(id, username, display_name)')
        .eq('market_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      adminSupabase
        .from('comments')
        .select('id, content, is_deleted, created_at, user:users!user_id(id, username, display_name)')
        .eq('market_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  if (marketError || !market) {
    return NextResponse.json({ success: false, error: '마켓을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: { market, recentBets: bets ?? [], recentComments: comments ?? [] },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, is_hidden } = body

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (status !== undefined) {
      if (!['open', 'closed'].includes(status)) {
        return NextResponse.json({ success: false, error: '유효하지 않은 상태값입니다.' }, { status: 400 })
      }
      updatePayload.status = status
    }
    if (typeof is_hidden === 'boolean') {
      updatePayload.is_hidden = is_hidden
    }

    if (Object.keys(updatePayload).length <= 1) {
      return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 })
    }

    const { error } = await adminSupabase
      .from('markets')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: '마켓 상태 변경 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin market PATCH error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    const { error } = await adminSupabase
      .from('markets')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: '마켓 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin market DELETE error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
