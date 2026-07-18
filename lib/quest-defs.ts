/**
 * 퀘스트 정의 (클라이언트/서버 공용)
 * lib/quest.ts 는 adminSupabase 를 import 하므로 클라이언트 컴포넌트에서는
 * 반드시 이 파일에서 정의를 가져온다.
 */

/**
 * 일일 퀘스트 정의 (DAILY_QUESTS)
 */
export const DAILY_QUESTS = [
  {
    type: 'daily_checkin',
    title: '오늘 출석하기',
    description: '하루에 한 번 출석 체크인',
    points: 1000,
    icon: 'calendar',
  },
  {
    type: 'daily_bet',
    title: '예측 참여하기',
    description: '마켓에 1회 이상 예측',
    points: 1000,
    icon: 'trending-up',
  },
  {
    type: 'daily_comment',
    title: '댓글 달기',
    description: '마켓에 댓글 1개 작성',
    points: 500,
    icon: 'message-circle',
  },
  {
    type: 'daily_share',
    title: '마켓 공유하기',
    description: '마켓을 1회 이상 공유',
    points: 500,
    icon: 'share-2',
  },
] as const

export type DailyQuestType = (typeof DAILY_QUESTS)[number]['type']

/**
 * 1회성 퀘스트 정의 (ONETIME_QUESTS)
 * 날짜와 무관하게 유저당 1회만 완료/보상 지급
 */
export const ONETIME_QUESTS = [
  {
    type: 'bookmark_home',
    title: '예견 바로가기 추가하기',
    description: 'PC는 북마크(Ctrl+D), 모바일은 홈 화면에 예견을 추가하세요',
    points: 100000,
    icon: 'bookmark-plus',
  },
] as const

export type OnetimeQuestType = (typeof ONETIME_QUESTS)[number]['type']

export function isOnetimeQuest(questType: string): questType is OnetimeQuestType {
  return ONETIME_QUESTS.some((q) => q.type === questType)
}
