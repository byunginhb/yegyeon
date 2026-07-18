import { adminSupabase } from '@/lib/supabase/admin'

/**
 * 출석 보상 계산 (streak → points)
 * streak 1-2일: 1000p / 3-6일: 2000p / 7-13일: 5000p / 14-29일: 10000p / 30일+: 20000p
 */
export function calculateAttendanceReward(streakCount: number): number {
  if (streakCount >= 30) return 20000
  if (streakCount >= 14) return 10000
  if (streakCount >= 7) return 5000
  if (streakCount >= 3) return 2000
  return 1000
}

/**
 * 어제 날짜 문자열 (YYYY-MM-DD, UTC 기준)
 */
export function getYesterdayDate(): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - 1)
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 퀘스트 정의는 클라이언트 안전 파일(lib/quest-defs.ts)에 있고, 서버 코드 호환을 위해 재수출한다.
export {
  DAILY_QUESTS,
  ONETIME_QUESTS,
  isOnetimeQuest,
  type DailyQuestType,
  type OnetimeQuestType,
} from '@/lib/quest-defs'

import { DAILY_QUESTS, type DailyQuestType } from '@/lib/quest-defs'

const QUEST_LOOKUP = new Map(DAILY_QUESTS.map((q) => [q.type, q]))

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 * Vercel(UTC)과 로컬(KST) 환경 모두에서 일관되게 UTC 날짜를 사용한다.
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
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
/**
 * @param options.pointsEarned - 실제 지급할 포인트 (미지정 시 quest.points 사용)
 * @param options.skipPoints   - true 이면 포인트/잔액 업데이트 생략 (호출 측에서 이미 지급한 경우)
 */
export async function triggerQuestComplete(
  userId: string,
  questType: DailyQuestType | string,
  options?: { pointsEarned?: number; skipPoints?: boolean }
): Promise<void> {
  const quest = QUEST_LOOKUP.get(questType as DailyQuestType)
  if (!quest) return

  const today = getTodayDate()
  const earnedPoints = options?.pointsEarned ?? quest.points
  const skipPoints = options?.skipPoints ?? false

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

  if (existing?.completed_at) return

  // 퀘스트 완료 기록
  if (existing?.id) {
    const { error } = await adminSupabase
      .from('user_quest_progress')
      .update({ completed_at: new Date().toISOString(), points_earned: earnedPoints })
      .eq('id', existing.id)
    if (error) {
      console.error('triggerQuestComplete update error', { userId, questType, error })
      return
    }
  } else {
    const { error } = await adminSupabase
      .from('user_quest_progress')
      .insert({
        user_id: userId,
        quest_type: quest.type,
        quest_date: today,
        completed_at: new Date().toISOString(),
        points_earned: earnedPoints,
      })
    if (error) {
      if (error.code === '23505') return
      console.error('triggerQuestComplete insert error', { userId, questType, error })
      return
    }
  }

  // skipPoints: 호출 측(출석 등)에서 이미 포인트를 지급했으므로 생략
  if (skipPoints) return

  const { data: userRow, error: userError } = await adminSupabase
    .from('users')
    .select('id, points, is_banned')
    .eq('id', userId)
    .single()

  if (userError || !userRow) {
    console.error('triggerQuestComplete user not found', { userId, userError })
    return
  }

  if (userRow.is_banned) return

  const newBalance = (userRow.points ?? 0) + earnedPoints

  const { error: pointError } = await adminSupabase
    .from('users')
    .update({ points: newBalance })
    .eq('id', userId)

  if (pointError) {
    console.error('triggerQuestComplete point update error', { userId, pointError })
    return
  }

  const { error: txError } = await adminSupabase.from('point_transactions').insert({
    user_id: userId,
    type: 'quest_reward',
    amount: earnedPoints,
    balance: newBalance,
    note: `${quest.title} 완료`,
  })

  if (txError) {
    console.error('triggerQuestComplete tx insert error', { userId, txError })
  }
}
