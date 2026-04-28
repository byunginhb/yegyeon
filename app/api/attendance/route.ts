import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { triggerQuestComplete, getTodayDate } from '@/lib/quest'

/**
 * 출석 보상 계산
 * streak 1-2일: 10p
 * streak 3-6일: 20p
 * streak 7-13일: 50p
 * streak 14-29일: 100p
 * streak 30일+: 200p
 */
function calculateAttendanceReward(streakCount: number): number {
  if (streakCount >= 30) return 200
  if (streakCount >= 14) return 100
  if (streakCount >= 7) return 50
  if (streakCount >= 3) return 20
  return 10
}

/**
 * 어제 날짜 문자열 (YYYY-MM-DD)
 */
function getYesterdayDate(): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * GET /api/attendance
 * 오늘 출석 여부 + 현재 스트릭 + 다음 보상
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const today = getTodayDate()
    const yesterday = getYesterdayDate()

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: last } = await adminSupabase
      .from('attendance')
      .select('checked_date, streak_count, points_earned')
      .eq('user_id', dbUser.id)
      .order('checked_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const checkedToday = last?.checked_date === today

    let currentStreak = 0
    if (last) {
      if (last.checked_date === today || last.checked_date === yesterday) {
        currentStreak = last.streak_count
      }
    }

    const nextStreak = checkedToday ? currentStreak : currentStreak + 1
    const nextReward = calculateAttendanceReward(nextStreak)

    return NextResponse.json({
      success: true,
      data: {
        checked_today: checkedToday,
        streak_count: currentStreak,
        points_earned_today: checkedToday ? last?.points_earned ?? null : null,
        next_reward: nextReward,
      },
    })
  } catch (err) {
    console.error('attendance GET unexpected error', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/attendance
 * 오늘 출석 체크인
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const today = getTodayDate()
    const yesterday = getYesterdayDate()

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id, points, is_banned')
      .eq('auth_id', session.user.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (dbUser.is_banned) {
      return NextResponse.json(
        { success: false, error: '정지된 계정입니다.' },
        { status: 403 }
      )
    }

    const { data: lastRow } = await adminSupabase
      .from('attendance')
      .select('id, checked_date, streak_count')
      .eq('user_id', dbUser.id)
      .order('checked_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastRow?.checked_date === today) {
      return NextResponse.json(
        { success: false, error: '오늘은 이미 출석했습니다.' },
        { status: 409 }
      )
    }

    let newStreak = 1
    if (lastRow?.checked_date === yesterday) {
      newStreak = (lastRow.streak_count ?? 0) + 1
    }

    const reward = calculateAttendanceReward(newStreak)
    const newBalance = (dbUser.points ?? 0) + reward

    // 1) attendance 기록
    const { error: insertError } = await adminSupabase.from('attendance').insert({
      user_id: dbUser.id,
      checked_date: today,
      streak_count: newStreak,
      points_earned: reward,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: '오늘은 이미 출석했습니다.' },
          { status: 409 }
        )
      }
      console.error('attendance POST insert error', insertError)
      return NextResponse.json(
        { success: false, error: '출석 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2) 포인트 지급
    const { error: pointError } = await adminSupabase
      .from('users')
      .update({ points: newBalance })
      .eq('id', dbUser.id)

    if (pointError) {
      console.error('attendance POST point update error', pointError)
      return NextResponse.json(
        { success: false, error: '포인트 지급에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 3) 트랜잭션 로그
    const { error: txError } = await adminSupabase.from('point_transactions').insert({
      user_id: dbUser.id,
      type: 'attendance_bonus',
      amount: reward,
      balance: newBalance,
      note: `출석 ${newStreak}일차`,
    })

    if (txError) {
      console.error('attendance POST tx insert error', txError)
    }

    // 4) daily_checkin 퀘스트 자동 완료 (실패해도 무시)
    try {
      await triggerQuestComplete(dbUser.id, 'daily_checkin')
    } catch (e) {
      console.error('daily_checkin quest trigger failed', e)
    }

    return NextResponse.json({
      success: true,
      data: {
        checked_today: true,
        streak_count: newStreak,
        points_earned_today: reward,
        next_reward: calculateAttendanceReward(newStreak + 1),
      },
    })
  } catch (err) {
    console.error('attendance POST unexpected error', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
