import { adminSupabase } from '@/lib/supabase/admin'

/**
 * 일일 퀘스트 정의 (DAILY_QUESTS)
 * 클라이언트와 서버에서 모두 참조 가능하도록 export
 */
export const DAILY_QUESTS = [
  {
    type: 'daily_checkin',
    title: '오늘 출석하기',
    description: '하루에 한 번 출석 체크인',
    points: 10,
    icon: 'calendar',
  },
  {
    type: 'daily_bet',
    title: '예측 참여하기',
    description: '마켓에 1회 이상 베팅',
    points: 10,
    icon: 'trending-up',
  },
  {
    type: 'daily_comment',
    title: '댓글 달기',
    description: '마켓에 댓글 1개 작성',
    points: 5,
    icon: 'message-circle',
  },
  {
    type: 'daily_share',
    title: '마켓 공유하기',
    description: '마켓을 1회 이상 공유',
    points: 5,
    icon: 'share-2',
  },
] as const

export type DailyQuestType = (typeof DAILY_QUESTS)[number]['type']

const QUEST_LOOKUP = new Map(DAILY_QUESTS.map((q) => [q.type, q]))

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 * Postgres 의 CURRENT_DATE 와 동일하게 서버 로컬 타임존을 사용한다.
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 퀘스트 자동 완료 트리거 (서버 사이드 전용)
 *
 * - 이미 완료된 퀘스트면 아무 동작도 하지 않음
 * - 새로 완료되면 포인트 지급 + user_quest_progress 기록 + point_transactions 기록
 * - 호출 측에서 try-catch 로 감싸서 본 동작에 영향이 없도록 사용
 *
 * @param userId  users.id (auth_id 가 아님에 주의)
 * @param questType  DAILY_QUESTS 의 type 중 하나
 */
export async function triggerQuestComplete(
  userId: string,
  questType: DailyQuestType | string
): Promise<void> {
  const quest = QUEST_LOOKUP.get(questType as DailyQuestType)
  if (!quest) {
    // 정의되지 않은 퀘스트 타입은 조용히 무시
    return
  }

  const today = getTodayDate()

  // 이미 완료된 기록이 있는지 확인
  const { data: existing, error: selectError } = await adminSupabase
    .from('user_quest_progress')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('quest_type', quest.type)
    .eq('quest_date', today)
    .maybeSingle()

  if (selectError) {
    console.error('triggerQuestComplete select error', { userId, questType, selectError })
    return
  }

  if (existing?.completed_at) {
    // 이미 완료됨 — 무시
    return
  }

  // 사용자 잔액 확인 (포인트 누적용)
  const { data: userRow, error: userError } = await adminSupabase
    .from('users')
    .select('id, points, is_banned')
    .eq('id', userId)
    .single()

  if (userError || !userRow) {
    console.error('triggerQuestComplete user not found', { userId, userError })
    return
  }

  if (userRow.is_banned) {
    return
  }

  const newBalance = (userRow.points ?? 0) + quest.points

  if (existing?.id) {
    // 같은 날짜에 row 가 있는데 completed_at 만 비어있는 경우 update
    const { error: updateError } = await adminSupabase
      .from('user_quest_progress')
      .update({
        completed_at: new Date().toISOString(),
        points_earned: quest.points,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('triggerQuestComplete update error', { userId, questType, updateError })
      return
    }
  } else {
    const { error: insertError } = await adminSupabase
      .from('user_quest_progress')
      .insert({
        user_id: userId,
        quest_type: quest.type,
        quest_date: today,
        completed_at: new Date().toISOString(),
        points_earned: quest.points,
      })

    if (insertError) {
      // UNIQUE 제약 위반 등은 동시 호출 경합으로 발생 가능 — 그냥 무시
      if (insertError.code === '23505') return
      console.error('triggerQuestComplete insert error', { userId, questType, insertError })
      return
    }
  }

  // 포인트 지급
  const { error: pointError } = await adminSupabase
    .from('users')
    .update({ points: newBalance })
    .eq('id', userId)

  if (pointError) {
    console.error('triggerQuestComplete point update error', { userId, pointError })
    return
  }

  // 트랜잭션 로그
  const { error: txError } = await adminSupabase.from('point_transactions').insert({
    user_id: userId,
    type: 'quest_reward',
    amount: quest.points,
    balance: newBalance,
    note: `${quest.title} 완료`,
  })

  if (txError) {
    console.error('triggerQuestComplete tx insert error', { userId, txError })
  }
}
