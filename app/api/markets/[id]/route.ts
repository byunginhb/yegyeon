import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ImageUrlSchema = z
  .string()
  .trim()
  .url()
  .max(1000)
  .refine((url) => /\/storage\/v1\/object\/public\/market-images\//.test(url), {
    message: '허용되지 않은 이미지 경로입니다.',
  })

// 메타데이터 및 마감일 수정 허용. 마켓 타입·옵션·확률 등 정합성에 영향이 있는 필드는 제외.
const UpdateMarketSchema = z
  .object({
    title: z.string().trim().min(5, '제목은 5자 이상이어야 합니다.').max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    thumbnail_url: ImageUrlSchema.nullish(),
    category_id: z.number().int().positive('카테고리를 선택해주세요.').optional(),
    resolution_criteria: z.string().trim().max(2000).nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    close_date: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 항목이 없습니다.' })

function normalizeCloseDate(input: string): Date | null {
  // datetime-local (YYYY-MM-DDTHH:mm) → KST 해석, ISO → 그대로
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
    // 시간 정보 있음 — 사용자 입력대로 (KST 가정)
    return new Date(`${input.replace('Z', '')}+09:00`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // 날짜만 — KST 23:59:59로 정규화
    return new Date(`${input}T23:59:59+09:00`)
  }
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params

    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id, is_banned, role')
      .eq('auth_id', authUser.id)
      .single()
    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (dbUser.is_banned) {
      return NextResponse.json({ success: false, error: '정지된 계정은 수정할 수 없습니다.' }, { status: 403 })
    }

    const { data: market, error: marketError } = await adminSupabase
      .from('markets')
      .select('id, creator_id, status, close_date')
      .eq('id', id)
      .single()
    if (marketError || !market) {
      return NextResponse.json({ success: false, error: '마켓을 찾을 수 없습니다.' }, { status: 404 })
    }

    const isCreator = market.creator_id === dbUser.id
    const isAdmin = dbUser.role === 'admin'
    if (!isCreator && !isAdmin) {
      return NextResponse.json({ success: false, error: '수정 권한이 없습니다.' }, { status: 403 })
    }
    if (
      market.status === 'resolved' ||
      market.status === 'cancelled' ||
      market.status === 'closed'
    ) {
      return NextResponse.json(
        { success: false, error: '종료되었거나 마감된 마켓은 수정할 수 없습니다.' },
        { status: 400 },
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = UpdateMarketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 },
      )
    }
    const data = parsed.data

    // 카테고리 active 검증
    if (data.category_id != null) {
      const { data: cat } = await adminSupabase
        .from('categories')
        .select('id')
        .eq('id', data.category_id)
        .eq('is_active', true)
        .maybeSingle()
      if (!cat) {
        return NextResponse.json({ success: false, error: '유효하지 않은 카테고리입니다.' }, { status: 400 })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description ?? null
    if (data.thumbnail_url !== undefined) updatePayload.thumbnail_url = data.thumbnail_url ?? null
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id
    if (data.resolution_criteria !== undefined)
      updatePayload.resolution_criteria = data.resolution_criteria ?? null
    if (data.tags !== undefined) updatePayload.tags = data.tags

    // 마감일 변경 처리
    if (data.close_date !== undefined) {
      const newCloseDate = normalizeCloseDate(data.close_date)
      if (!newCloseDate) {
        return NextResponse.json(
          { success: false, error: '마감일 형식이 잘못되었습니다.' },
          { status: 400 },
        )
      }
      const now = Date.now()
      const minClose = new Date(now + 60 * 60 * 1000) // 최소 1시간 후
      const maxClose = new Date(now + 5 * 365 * 24 * 60 * 60 * 1000) // 5년 이내
      if (newCloseDate <= minClose) {
        return NextResponse.json(
          { success: false, error: '마감일은 최소 1시간 이후여야 합니다.' },
          { status: 400 },
        )
      }
      if (newCloseDate > maxClose) {
        return NextResponse.json(
          { success: false, error: '마감일은 5년 이내여야 합니다.' },
          { status: 400 },
        )
      }
      // 일반 작성자는 연장(미래로 이동)만 허용. admin은 단축/연장 모두 허용.
      const currentCloseDate = new Date(market.close_date)
      if (!isAdmin && newCloseDate.getTime() <= currentCloseDate.getTime()) {
        return NextResponse.json(
          {
            success: false,
            error: '마감일은 현재보다 미래로만 변경 가능합니다 (연장만 허용).',
          },
          { status: 400 },
        )
      }
      updatePayload.close_date = newCloseDate.toISOString()
    }

    const { error: updateError } = await adminSupabase
      .from('markets')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      console.error('market update failed', updateError)
      return NextResponse.json({ success: false, error: '마켓 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (err) {
    console.error('markets PATCH error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
