import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { DAILY_QUESTS, getTodayDate, getYesterdayDate, calculateAttendanceReward } from '@/lib/quest'

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
    const yesterday = getYesterdayDate()

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

    // 출석 스트릭으로 daily_checkin 퀘스트 포인트를 동적 계산
    const { data: lastAttendance } = await adminSupabase
      .from('attendance')
      .select('checked_date, streak_count')
      .eq('user_id', userData.id)
      .order('checked_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const checkedToday = lastAttendance?.checked_date === today
    const currentStreak = lastAttendance
      ? (lastAttendance.checked_date === today || lastAttendance.checked_date === yesterday
          ? lastAttendance.streak_count
          : 0)
      : 0
    const nextStreak = checkedToday ? currentStreak : currentStreak + 1
    const attendanceNextReward = calculateAttendanceReward(nextStreak)

    const progress = (userData.user_quest_progress ?? []) as QuestProgressRow[]

    const progressMap = new Map<string, QuestProgressRow>()
    for (const row of (progress ?? []) as QuestProgressRow[]) {
      progressMap.set(row.quest_type, row)
    }

    const quests = DAILY_QUESTS.map((q) => {
      const matched = progressMap.get(q.type)
      const completed = Boolean(matched?.completed_at)

      // daily_checkin은 스트릭 기반 동적 포인트, 완료된 경우 실제 적립액 표시
      let displayPoints: number
      if (completed) {
        displayPoints = matched?.points_earned ?? q.points
      } else if (q.type === 'daily_checkin') {
        displayPoints = attendanceNextReward
      } else {
        displayPoints = q.points
      }

      return {
        type: q.type,
        title: q.title,
        description: q.description,
        points: displayPoints,
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
