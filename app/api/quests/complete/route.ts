import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { DAILY_QUESTS, getTodayDate, type DailyQuestType } from '@/lib/quest'

const QUEST_TYPES = DAILY_QUESTS.map((q) => q.type) as [DailyQuestType, ...DailyQuestType[]]

const CompleteSchema = z.object({
  quest_type: z.enum(QUEST_TYPES),
})

const QUEST_LOOKUP = new Map(DAILY_QUESTS.map((q) => [q.type, q]))

/**
 * POST /api/quests/complete
 * body: { quest_type: string }
 *
 * - 이미 완료된 퀘스트면 200 + { already_completed: true }
 * - 새로 완료면 포인트 지급 + 진행 기록 + 트랜잭션 기록
 */
export async function POST(request: NextRequest) {
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 본문입니다.' },
        { status: 400 }
      )
    }

    const parsed = CompleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 퀘스트 타입입니다.',
        },
        { status: 400 }
      )
    }

    const quest = QUEST_LOOKUP.get(parsed.data.quest_type)
    if (!quest) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 퀘스트입니다.' },
        { status: 400 }
      )
    }

    // daily_checkin 은 /api/attendance POST 에서 트리거되므로 직접 호출 차단
    if (quest.type === 'daily_checkin') {
      return NextResponse.json(
        {
          success: false,
          error: '출석 퀘스트는 출석 체크인을 통해서만 완료할 수 있습니다.',
        },
        { status: 400 }
      )
    }

    // daily_bet, daily_comment 도 본 API 에서 직접 완료 차단 (서버 트리거 전용)
    if (quest.type === 'daily_bet' || quest.type === 'daily_comment') {
      return NextResponse.json(
        {
          success: false,
          error: '이 퀘스트는 해당 활동을 통해서만 완료됩니다.',
        },
        { status: 400 }
      )
    }

    const { data: dbUser, error: userError } = await adminSupabase
      .from('users')
      .select('id, points, is_banned')
      .eq('auth_id', authUser.id)
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

    const today = getTodayDate()

    // 이미 완료된 기록 확인
    const { data: existing, error: selectError } = await adminSupabase
      .from('user_quest_progress')
      .select('id, completed_at, points_earned')
      .eq('user_id', dbUser.id)
      .eq('quest_type', quest.type)
      .eq('quest_date', today)
      .maybeSingle()

    if (selectError) {
      console.error('quests/complete select error', selectError)
      return NextResponse.json(
        { success: false, error: '퀘스트 정보를 확인하지 못했습니다.' },
        { status: 500 }
      )
    }

    if (existing?.completed_at) {
      return NextResponse.json({
        success: true,
        data: {
          already_completed: true,
          quest_type: quest.type,
          points_earned: existing.points_earned ?? quest.points,
        },
      })
    }

    const newBalance = (dbUser.points ?? 0) + quest.points
    const completedAt = new Date().toISOString()

    if (existing?.id) {
      const { error: updateError } = await adminSupabase
        .from('user_quest_progress')
        .update({
          completed_at: completedAt,
          points_earned: quest.points,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('quests/complete update error', updateError)
        return NextResponse.json(
          { success: false, error: '퀘스트 완료 처리에 실패했습니다.' },
          { status: 500 }
        )
      }
    } else {
      const { error: insertError } = await adminSupabase
        .from('user_quest_progress')
        .insert({
          user_id: dbUser.id,
          quest_type: quest.type,
          quest_date: today,
          completed_at: completedAt,
          points_earned: quest.points,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          // 동시성 — 다시 조회해서 already_completed 응답
          return NextResponse.json({
            success: true,
            data: {
              already_completed: true,
              quest_type: quest.type,
              points_earned: quest.points,
            },
          })
        }
        console.error('quests/complete insert error', insertError)
        return NextResponse.json(
          { success: false, error: '퀘스트 완료 처리에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    // 포인트 지급
    const { error: pointError } = await adminSupabase
      .from('users')
      .update({ points: newBalance })
      .eq('id', dbUser.id)

    if (pointError) {
      console.error('quests/complete point update error', pointError)
      return NextResponse.json(
        { success: false, error: '포인트 지급에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 트랜잭션 로그
    const { error: txError } = await adminSupabase.from('point_transactions').insert({
      user_id: dbUser.id,
      type: 'quest_reward',
      amount: quest.points,
      balance: newBalance,
      note: `${quest.title} 완료`,
    })

    if (txError) {
      console.error('quests/complete tx insert error', txError)
    }

    return NextResponse.json({
      success: true,
      data: {
        already_completed: false,
        quest_type: quest.type,
        points_earned: quest.points,
        new_balance: newBalance,
      },
    })
  } catch (err) {
    console.error('quests/complete unexpected error', err)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
