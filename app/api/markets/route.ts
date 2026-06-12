import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || 'open'
    const sort = searchParams.get('sort') || 'trending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('markets')
      .select(
        `
        id,
        slug,
        title,
        description,
        thumbnail_url,
        type,
        status,
        creator_id,
        category_id,
        close_date,
        resolved_at,
        resolution,
        total_volume,
        unique_traders,
        comment_count,
        yes_probability,
        yes_amount,
        no_amount,
        is_hidden,
        tags,
        created_at,
        updated_at,
        creator:users!creator_id(id, username, display_name, avatar_url),
        category:categories!category_id(id, name, slug, icon, color)
        `,
        { count: 'exact' }
      )
      .eq('is_hidden', false)
      .is('auto_kind', null) // 자동 마켓(BTC 5분 등)은 전용 위젯 전용

    // 상태 필터: 공개 API는 pending/rejected 노출 금지
    const PUBLIC_STATUSES = ['open', 'closed', 'resolved', 'cancelled']
    if (status === 'all') {
      query = query.in('status', PUBLIC_STATUSES)
    } else if (PUBLIC_STATUSES.includes(status)) {
      query = query.eq('status', status)
    } else {
      // pending/rejected 직접 요청 → 빈 결과
      query = query.eq('status', '__none__')
    }

    // 카테고리 필터 (slug 기반)
    if (category && category !== 'all') {
      const { data: cat } = await adminSupabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single()
      if (cat) {
        query = query.eq('category_id', cat.id)
      }
    }

    // 검색 필터: 와일드카드 문자 이스케이프 + 길이 제한 (DoS 방지)
    if (search) {
      const sanitized = search
        .slice(0, 100)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
      if (sanitized.trim()) {
        query = query.ilike('title', `%${sanitized}%`)
      }
    }

    // 정렬
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'closing_soon':
        query = query.order('close_date', { ascending: true })
        break
      case 'volume':
        query = query.order('total_volume', { ascending: false })
        break
      case 'trending':
      default:
        query = query.order('unique_traders', { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('markets query error:', error)
      return NextResponse.json(
        { success: false, error: '마켓 목록을 불러오는 데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: {
        total: count ?? 0,
        page,
        limit,
        hasMore: (count ?? 0) > offset + limit,
      },
    })
  } catch (err) {
    console.error('markets route error:', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
