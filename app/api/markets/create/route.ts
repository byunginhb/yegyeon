import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

const OPTION_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6']

function generateSlug(title: string): string {
  const kebab = title
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  const random = Math.random().toString(36).slice(2, 10)
  return kebab ? `${kebab}-${random}` : random
}

const BaseSchema = z.object({
  title: z.string().trim().min(5, '제목은 5자 이상이어야 합니다.').max(200),
  description: z.string().trim().max(2000).optional(),
  category_id: z.number().int().positive().optional(),
  close_date: z.string().min(1, '마감일이 필요합니다.'),
  resolution_criteria: z.string().trim().max(2000).optional(),
})

const CreateMarketSchema = z.discriminatedUnion('type', [
  BaseSchema.extend({
    type: z.literal('binary'),
    yes_probability: z.number().min(0.01).max(0.99),
  }),
  BaseSchema.extend({
    type: z.literal('multiple_choice'),
    options: z
      .array(z.object({ text: z.string().trim().min(1).max(100) }))
      .min(2, '선택지는 2개 이상이어야 합니다.')
      .max(8, '선택지는 8개 이하여야 합니다.'),
  }),
  BaseSchema.extend({
    type: z.literal('numeric'),
    min_value: z.number().finite(),
    max_value: z.number().finite(),
    unit: z.string().trim().max(20).optional(),
  }),
])

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id, is_banned')
      .eq('auth_id', authUser.id)
      .single()
    if (userError || !dbUser) {
      return NextResponse.json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (dbUser.is_banned) {
      return NextResponse.json({ success: false, error: '정지된 계정은 마켓을 생성할 수 없습니다.' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const parsed = CreateMarketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? '입력이 잘못되었습니다.' },
        { status: 400 }
      )
    }
    const data = parsed.data

    // 마감일 검증
    const closeDate = normalizeCloseDate(data.close_date)
    if (!closeDate) {
      return NextResponse.json({ success: false, error: '마감일 형식이 잘못되었습니다.' }, { status: 400 })
    }
    const minClose = new Date(Date.now() + 60 * 60 * 1000) // 최소 1시간 후
    const maxClose = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) // 5년 이내
    if (closeDate <= minClose) {
      return NextResponse.json({ success: false, error: '마감일은 최소 1시간 이후여야 합니다.' }, { status: 400 })
    }
    if (closeDate > maxClose) {
      return NextResponse.json({ success: false, error: '마감일은 5년 이내여야 합니다.' }, { status: 400 })
    }

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

    // 타입별 추가 검증
    if (data.type === 'numeric') {
      if (data.min_value >= data.max_value) {
        return NextResponse.json({ success: false, error: '최솟값은 최댓값보다 작아야 합니다.' }, { status: 400 })
      }
    }
    if (data.type === 'multiple_choice') {
      const trimmed = data.options.map((o) => o.text.trim())
      const uniq = new Set(trimmed)
      if (uniq.size !== trimmed.length) {
        return NextResponse.json({ success: false, error: '중복된 선택지가 있습니다.' }, { status: 400 })
      }
    }

    // markets insert payload
    const marketInsert: Record<string, unknown> = {
      title: data.title,
      description: data.description ?? null,
      category_id: data.category_id ?? null,
      creator_id: dbUser.id,
      type: data.type,
      status: 'pending',
      close_date: closeDate.toISOString(),
      resolution_criteria: data.resolution_criteria ?? null,
    }
    if (data.type === 'binary') {
      marketInsert.yes_probability = data.yes_probability
      // 초기 유동성을 yes/no 풀에 균등 배분
      const liquidity = 100
      marketInsert.yes_amount = Math.round(liquidity * data.yes_probability)
      marketInsert.no_amount = liquidity - Math.round(liquidity * data.yes_probability)
    }
    if (data.type === 'numeric') {
      marketInsert.min_value = data.min_value
      marketInsert.max_value = data.max_value
      marketInsert.unit = data.unit ?? null
    }

    // slug 충돌 시 자동 재시도 (DB unique violation을 catch)
    let market: { id: string } | null = null
    let lastError: { code?: string; message?: string } | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      marketInsert.slug = generateSlug(data.title)
      const { data: inserted, error } = await adminSupabase
        .from('markets')
        .insert(marketInsert)
        .select('id')
        .single()
      if (!error && inserted) {
        market = inserted
        break
      }
      lastError = error
      if (error?.code !== '23505') break // unique 외 에러는 즉시 실패
    }

    if (!market) {
      console.error('market insert failed', lastError)
      return NextResponse.json({ success: false, error: '마켓 생성에 실패했습니다.' }, { status: 500 })
    }

    // multiple_choice 옵션 insert (확률 합 정확히 1로 보정)
    if (data.type === 'multiple_choice') {
      const n = data.options.length
      const baseProb = Math.floor((1 / n) * 10000) / 10000
      const optionRows = data.options.map((opt, idx) => ({
        market_id: market!.id,
        text: opt.text.trim(),
        // 마지막 옵션이 잔차를 흡수해 합=1 보장
        probability: idx === n - 1 ? parseFloat((1 - baseProb * (n - 1)).toFixed(4)) : baseProb,
        total_amount: 0,
        sort_order: idx,
        color: OPTION_COLORS[idx % OPTION_COLORS.length],
      }))

      const { error: optError } = await adminSupabase.from('market_options').insert(optionRows)
      if (optError) {
        // 보상 롤백
        await adminSupabase.from('markets').delete().eq('id', market.id)
        console.error('market_options insert failed', optError)
        return NextResponse.json({ success: false, error: '선택지 저장에 실패했습니다.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data: { id: market.id } })
  } catch (err) {
    console.error('markets create error:', err)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
