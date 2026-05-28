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

// 메타데이터만 수정 허용. 마켓 타입·옵션·마감일·확률 등 정합성에 영향이 있는 필드는 제외.
const UpdateMarketSchema = z
  .object({
    title: z.string().trim().min(5, '제목은 5자 이상이어야 합니다.').max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    thumbnail_url: ImageUrlSchema.nullish(),
    category_id: z.number().int().positive('카테고리를 선택해주세요.').optional(),
    resolution_criteria: z.string().trim().max(2000).nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 항목이 없습니다.' })

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
      .select('id, creator_id, status')
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
    if (market.status === 'resolved' || market.status === 'cancelled') {
      return NextResponse.json({ success: false, error: '종료된 마켓은 수정할 수 없습니다.' }, { status: 400 })
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
