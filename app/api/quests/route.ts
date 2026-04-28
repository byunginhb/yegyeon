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
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const today = getTodayDate()

    const { data: progress, error: progressError } = await adminSupabase
      .from('user_quest_progress')
      .select('quest_type, completed_at, points_earned')
      .eq('user_id', dbUser.id)
      .eq('quest_date', today)

    if (progressError) {
      console.error('quests GET progress error', progressError)
      return NextResponse.json(
        { success: false, error: '퀘스트 정보를 불러오지 못했습니다.' },
        { status: 500 }
      )
    }

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
