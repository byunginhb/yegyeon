import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { DAILY_QUESTS, getTodayDate } from '@/lib/quest'

interface QuestProgressRow {
  quest_type: string
  completed_at: string | null
  points_earned: number | null
}

/**
 * GET /api/quests
 * 오늘의 퀘스트 목록과 완료 현황 반환
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    // getSession()으로 Auth 서버 HTTP 왕복 제거
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const today = getTodayDate()

    // users + 오늘 퀘스트 진행 현황을 단일 JOIN 쿼리로 통합
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, user_quest_progress(quest_type, completed_at, points_earned)')
      .eq('auth_id', session.user.id)
      .eq('user_quest_progress.quest_date', today)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const progress = (userData.user_quest_progress ?? []) as QuestProgressRow[]

    const progressMap = new Map<string, QuestProgressRow>()
    for (const row of (progress ?? []) as QuestProgressRow[]) {
      progressMap.set(row.quest_type, row)
    }

    const quests = DAILY_QUESTS.map((q) => {
      const matched = progressMap.get(q.type)
      const completed = Boolean(matched?.completed_at)
      return {
        type: q.type,
        title: q.title,
        description: q.description,
        points: q.points,
        icon: q.icon,
        completed,
        completed_at: matched?.completed_at ?? null,
      }
    })

    const totalPointsToday = quests.reduce((sum, q) => {
      const matched = progressMap.get(q.type)
      if (matched?.completed_at) {
        return sum + (matched.points_earned ?? q.points)
      }
      return sum
    }, 0)

    const allCompleted = quests.every((q) => q.completed)

    return NextResponse.json({
      success: true,
      data: {
        quests,
        total_points_today: totalPointsToday,
        all_completed: allCompleted,
      },
    })
  } catch (err) {
    console.error('quests GET unexpected error', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
