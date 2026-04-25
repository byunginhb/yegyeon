import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return { authUser: user, dbUserId: profile.id as string }
}

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1, '거절 사유를 입력해주세요.').max(500) }),
  z.object({ action: z.literal('status'), status: z.enum(['open', 'closed']) }),
  z.object({ action: z.literal('hide'), is_hidden: z.boolean() }),
])

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

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const input = parsed.data
    let updatePayload: Record<string, unknown>

    if (input.action === 'approve') {
      const { data: current } = await adminSupabase
        .from('markets').select('status').eq('id', id).single()
      if (current?.status !== 'pending') {
        return NextResponse.json({ success: false, error: '승인 대기 상태의 마켓만 승인할 수 있습니다.' }, { status: 409 })
      }
      updatePayload = {
        status: 'open',
        reviewed_by: admin.dbUserId,
        reviewed_at: now,
        rejection_reason: null,
        updated_at: now,
      }
    } else if (input.action === 'reject') {
      const { data: current } = await adminSupabase
        .from('markets').select('status').eq('id', id).single()
      if (current?.status !== 'pending') {
        return NextResponse.json({ success: false, error: '승인 대기 상태의 마켓만 거절할 수 있습니다.' }, { status: 409 })
      }
      updatePayload = {
        status: 'rejected',
        rejection_reason: input.reason,
        reviewed_by: admin.dbUserId,
        reviewed_at: now,
        updated_at: now,
      }
    } else if (input.action === 'status') {
      // pending 마켓은 approve/reject 액션으로만 상태 변경 가능 (우회 방지)
      const { data: current } = await adminSupabase
        .from('markets').select('status').eq('id', id).single()
      if (current?.status === 'pending' || current?.status === 'rejected') {
        return NextResponse.json(
          { success: false, error: 'pending/rejected 마켓은 approve/reject 액션을 사용해주세요.' },
          { status: 400 }
        )
      }
      updatePayload = { status: input.status, updated_at: now }
    } else {
      updatePayload = { is_hidden: input.is_hidden, updated_at: now }
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
