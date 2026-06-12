import { adminSupabase } from '@/lib/supabase/admin'
import type { CommentPosition } from '@/types'

/**
 * 주어진 마켓에서 여러 유저의 "대표 베팅 포지션"을 한 번에 조회한다.
 *
 * - bets 테이블은 RLS상 본인만 조회 가능하므로 반드시 서비스롤(adminSupabase)로 호출한다.
 * - 한 유저가 여러 번/여러 방향에 베팅했을 수 있으므로 방향별로 누적액을 합산한 뒤,
 *   누적 베팅액이 가장 큰 방향을 대표 포지션으로 선택한다.
 *
 * @returns userId → CommentPosition 매핑 (베팅 이력이 없는 유저는 키 자체가 없음)
 */
export async function getMarketPositions(
  marketId: string,
  userIds: string[]
): Promise<Record<string, CommentPosition>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) return {}

  const { data: bets, error } = await adminSupabase
    .from('bets')
    .select('user_id, option_id, outcome, amount')
    .eq('market_id', marketId)
    .in('user_id', uniqueIds)

  if (error || !bets || bets.length === 0) return {}

  // 다중 선택 마켓: option_id → 옵션 텍스트 매핑
  const optionIds = Array.from(
    new Set(bets.map((b) => b.option_id).filter((v): v is string => !!v))
  )
  let optionText: Record<string, string> = {}
  if (optionIds.length > 0) {
    const { data: opts } = await adminSupabase
      .from('market_options')
      .select('id, text')
      .in('id', optionIds)
    optionText = Object.fromEntries(
      (opts ?? []).map((o) => [o.id as string, o.text as string])
    )
  }

  // 유저별 → 방향키별 누적액 집계
  type Slot = { amount: number; label: string; kind: CommentPosition['kind'] }
  const perUser: Record<string, Record<string, Slot>> = {}

  for (const b of bets) {
    const optionId = b.option_id as string | null
    const outcome = String(b.outcome ?? '')
    const key = optionId ?? outcome
    const kind: CommentPosition['kind'] = optionId
      ? 'option'
      : outcome === 'YES'
        ? 'yes'
        : outcome === 'NO'
          ? 'no'
          : 'option'
    const label = optionId ? (optionText[optionId] ?? '옵션') : outcome

    const slots = (perUser[b.user_id as string] ??= {})
    const slot = (slots[key] ??= { amount: 0, label, kind })
    slot.amount += Number(b.amount) || 0
  }

  // 유저별 대표 포지션 = 누적액 최대 방향
  const result: Record<string, CommentPosition> = {}
  for (const [userId, slots] of Object.entries(perUser)) {
    const top = Object.values(slots).sort((a, b) => b.amount - a.amount)[0]
    if (top) result[userId] = { kind: top.kind, label: top.label, amount: top.amount }
  }
  return result
}
