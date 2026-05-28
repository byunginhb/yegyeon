import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { triggerQuestComplete } from '@/lib/quest'
import { extractFirstUrl, fetchOgMetadata } from '@/lib/og-fetch'
import type { Comment } from '@/types'

const COMMENT_SELECT = `
  id, market_id, user_id, content, is_deleted, created_at, updated_at,
  embed_url, embed_title, embed_description, embed_image,
  user:users!user_id(id, username, display_name, avatar_url)
`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const market_id = searchParams.get('market_id')

  if (!market_id) {
    return NextResponse.json({ success: false, error: 'market_id가 필요합니다' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('market_id', market_id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data as unknown as Comment[] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await request.json()
  const { market_id, content } = body

  if (!market_id || !content) {
    return NextResponse.json({ success: false, error: 'market_id와 content가 필요합니다' }, { status: 400 })
  }

  const trimmed = String(content).trim()
  if (trimmed.length === 0) {
    return NextResponse.json({ success: false, error: '댓글 내용을 입력해주세요' }, { status: 400 })
  }
  if (trimmed.length > 500) {
    return NextResponse.json({ success: false, error: '댓글은 500자 이내로 작성해주세요' }, { status: 400 })
  }

  // users 테이블에서 user_id 조회
  const { data: dbUser, error: userError } = await adminSupabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다' }, { status: 404 })
  }

  // OG 임베드: 본문에 URL이 있으면 첫 URL의 메타데이터를 가져온다.
  // fetch 실패/타임아웃은 무시하고 텍스트만 저장.
  let embed: {
    embed_url: string | null
    embed_title: string | null
    embed_description: string | null
    embed_image: string | null
  } = { embed_url: null, embed_title: null, embed_description: null, embed_image: null }

  const firstUrl = extractFirstUrl(trimmed)
  if (firstUrl) {
    try {
      const meta = await fetchOgMetadata(firstUrl)
      if (meta) {
        embed = {
          embed_url: meta.url,
          embed_title: meta.title,
          embed_description: meta.description,
          embed_image: meta.image,
        }
      } else {
        // fetch 실패해도 URL 자체는 기록 (UI에서 단순 링크 카드 fallback 가능)
        embed = { ...embed, embed_url: firstUrl.slice(0, 2048) }
      }
    } catch (e) {
      console.error('og fetch failed', e)
      embed = { ...embed, embed_url: firstUrl.slice(0, 2048) }
    }
  }

  const { data, error } = await adminSupabase
    .from('comments')
    .insert({ market_id, user_id: dbUser.id, content: trimmed, ...embed })
    .select(COMMENT_SELECT)
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // comment_count 증가 (실패해도 무시)
  try {
    await adminSupabase.rpc('increment_comment_count', { p_market_id: market_id })
  } catch {
    // 무시
  }

  // daily_comment 퀘스트 자동 완료 (실패해도 본 동작에 영향 없음)
  try {
    await triggerQuestComplete(dbUser.id, 'daily_comment')
  } catch (e) {
    console.error('daily_comment quest trigger failed', e)
  }

  return NextResponse.json({ success: true, data: data as unknown as Comment }, { status: 201 })
}
