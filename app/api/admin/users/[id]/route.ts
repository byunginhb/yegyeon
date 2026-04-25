import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminSupabase } from '@/lib/supabase/admin'
import { verifyAdmin, recordAdminLog } from '@/lib/admin-log'

const PatchSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  is_banned: z.boolean().optional(),
  points: z.number().int().min(0).max(1_000_000_000).optional(),
  points_delta: z.number().int().min(-1_000_000).max(1_000_000).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyAdmin()
  if (!ctx) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id: userId } = await params

  const [{ data: user, error: userError }, { data: bets }, { data: txs }, { count: marketCount }] =
    await Promise.all([
      adminSupabase
        .from('users')
        .select('id, auth_id, username, display_name, email, avatar_url, bio, points, role, is_banned, created_at, updated_at')
        .eq('id', userId)
        .single(),
      adminSupabase
        .from('bets')
        .select('id, outcome, amount, shares, payout, created_at, market:markets!market_id(id, slug, title, status)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      adminSupabase
        .from('point_transactions')
        .select('id, type, amount, balance, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      adminSupabase
        .from('markets')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', userId),
    ])

  if (userError || !user) {
    return NextResponse.json({ success: false, error: '유저를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      user,
      recentBets: bets ?? [],
      recentTransactions: txs ?? [],
      marketCount: marketCount ?? 0,
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await verifyAdmin()
    if (!ctx) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id: userId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }
    const { role, points, points_delta, is_banned } = parsed.data

    if (role === undefined && points === undefined && points_delta === undefined && is_banned === undefined) {
      return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 })
    }

    const { data: before, error: fetchError } = await adminSupabase
      .from('users')
      .select('id, points, role, is_banned')
      .eq('id', userId)
      .single()

    if (fetchError || !before) {
      return NextResponse.json({ success: false, error: '유저를 찾을 수 없습니다.' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = { updated_at: now }
    if (role !== undefined) updatePayload.role = role
    if (typeof is_banned === 'boolean') updatePayload.is_banned = is_banned

    let newBalance = before.points
    let deltaAmount = 0

    if (points_delta !== undefined) {
      deltaAmount = points_delta
      newBalance = before.points + deltaAmount
    } else if (points !== undefined) {
      newBalance = points
      deltaAmount = newBalance - before.points
    }

    if (newBalance < 0) {
      return NextResponse.json({ success: false, error: '포인트는 음수일 수 없습니다.' }, { status: 400 })
    }
    if (deltaAmount !== 0) {
      updatePayload.points = newBalance
    }

    const { data: after, error: updateError } = await adminSupabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, points, role, is_banned')
      .single()

    if (updateError || !after) {
      console.error('admin user update error', updateError)
      return NextResponse.json({ success: false, error: '유저 수정 실패' }, { status: 500 })
    }

    if (deltaAmount !== 0) {
      await adminSupabase.from('point_transactions').insert({
        user_id: userId,
        type: 'admin_adjust',
        amount: deltaAmount,
        balance: newBalance,
        ref_id: null,
        note: `관리자 포인트 조정 (${deltaAmount >= 0 ? '+' : ''}${deltaAmount})`,
      })
    }

    await recordAdminLog({
      adminId: ctx.adminUserId,
      action: 'update_user',
      targetType: 'user',
      targetId: userId,
      before,
      after,
    })

    return NextResponse.json({ success: true, data: after })
  } catch (err) {
    console.error('admin user PATCH error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
