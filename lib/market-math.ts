/**
 * LMSR (Logarithmic Market Scoring Rule) 기반 마켓 수학 유틸리티
 * Binary 마켓용 간소화 버전
 *
 * 수식:
 *   cost(q) = b * log(exp(q_yes/b) + exp(q_no/b))
 *   probability = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 */

const DEFAULT_LIQUIDITY = 100

/**
 * 현재 확률로부터 LMSR 내부 상태(q_yes, q_no)를 역산
 */
function inferShares(
  probability: number,
  liquidity: number
): { qYes: number; qNo: number } {
  // p = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
  // q_yes - q_no = b * log(p / (1-p))
  // 기준: q_no = 0 (상대값만 중요)
  const diff = liquidity * Math.log(probability / (1 - probability))
  return { qYes: diff, qNo: 0 }
}

/**
 * LMSR 비용 함수: C(q_yes, q_no) = b * log(exp(q_yes/b) + exp(q_no/b))
 */
function lmsrCost(qYes: number, qNo: number, liquidity: number): number {
  const a = qYes / liquidity
  const b = qNo / liquidity
  // 수치 안정성을 위해 log-sum-exp 트릭 사용
  const maxVal = Math.max(a, b)
  return liquidity * (maxVal + Math.log(Math.exp(a - maxVal) + Math.exp(b - maxVal)))
}

/**
 * 예측 후 새로운 확률 계산
 */
export function calcProbabilityAfterBet(
  currentProb: number,
  betAmount: number,
  outcome: 'YES' | 'NO',
  liquidity: number = DEFAULT_LIQUIDITY
): number {
  if (betAmount <= 0) return currentProb
  if (currentProb <= 0 || currentProb >= 1) return currentProb

  const { qYes, qNo } = inferShares(currentProb, liquidity)

  const newQYes = outcome === 'YES' ? qYes + betAmount : qYes
  const newQNo = outcome === 'NO' ? qNo + betAmount : qNo

  const newProb =
    Math.exp(newQYes / liquidity) /
    (Math.exp(newQYes / liquidity) + Math.exp(newQNo / liquidity))

  return Math.max(0.01, Math.min(0.99, newProb))
}

/**
 * 예측으로 받게 되는 share 수 계산
 * shares = 비용 변화량 = C(after) - C(before) 로 구매하는 shares
 * 실제 LMSR에서 amount를 지불하면 receives shares = amount (단순화)
 * 정확한 계산: 새 q값에서의 share 차이
 */
export function calcSharesReceived(
  currentProb: number,
  betAmount: number,
  outcome: 'YES' | 'NO',
  liquidity: number = DEFAULT_LIQUIDITY
): number {
  if (betAmount <= 0) return 0
  if (currentProb <= 0 || currentProb >= 1) return betAmount

  const { qYes, qNo } = inferShares(currentProb, liquidity)
  const costBefore = lmsrCost(qYes, qNo, liquidity)

  // 이진 탐색으로 shares 계산
  // betAmount = C(q_yes + shares, q_no) - C(q_yes, q_no) (YES인 경우)
  let lo = 0
  let hi = betAmount * 10
  const target = betAmount

  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    const costAfter =
      outcome === 'YES'
        ? lmsrCost(qYes + mid, qNo, liquidity)
        : lmsrCost(qYes, qNo + mid, liquidity)
    const cost = costAfter - costBefore

    if (cost < target) {
      lo = mid
    } else {
      hi = mid
    }

    if (hi - lo < 0.0001) break
  }

  return (lo + hi) / 2
}

/**
 * 잠재적 수익 계산 (deprecated — parimutuel 통일 이후 calcExpectedPayout 사용)
 * 각 share는 해결 시 ₣1 가치 (LMSR 가정 — 호환용으로 남겨둠)
 */
export function calcPotentialPayout(
  shares: number,
  _outcome: 'YES' | 'NO'
): number {
  return shares
}

/**
 * Parimutuel 예상 수익 — 예측 미리보기와 실제 정산을 일치시키는 단일 공식.
 *
 * 가정: 사용자가 amount 포인트를 'YES' 또는 'NO'에 예측하고 그 결과가 정답이면,
 *        나의 amount / 새 winner_pool 비율 × 새 total_pool 만큼 받음.
 *
 * 예: yes_pool=300, no_pool=200, 내가 NO에 100 → 결과 NO일 때
 *     expected = (100 / (200 + 100)) * (300 + 200 + 100) = 1/3 * 600 = 200
 *
 * 자기 예측분이 자기에게 포함되어 단순한 "self-fraction × 전체" 형태이므로
 * 실제 server-side parimutuel 정산 결과와 일치한다 (단, 다른 사용자가 동시에
 * 예측을 추가하면 수치 변동 가능 — 이건 본질적인 시장 변동성).
 */
export function calcExpectedPayoutBinary(
  amount: number,
  outcome: 'YES' | 'NO',
  yesPool: number,
  noPool: number
): number {
  if (amount <= 0) return 0
  const myPool = outcome === 'YES' ? yesPool : noPool
  const otherPool = outcome === 'YES' ? noPool : yesPool
  const newMyPool = myPool + amount
  const newTotalPool = myPool + otherPool + amount
  if (newMyPool <= 0) return 0
  return Math.floor((amount / newMyPool) * newTotalPool)
}

/**
 * Multiple choice 예상 수익. optionPool = 해당 옵션의 total_amount.
 * totalPool = 모든 옵션 total_amount 합.
 */
export function calcExpectedPayoutOption(
  amount: number,
  optionPool: number,
  totalPool: number
): number {
  if (amount <= 0) return 0
  const newOptionPool = optionPool + amount
  const newTotalPool = totalPool + amount
  if (newOptionPool <= 0) return 0
  return Math.floor((amount / newOptionPool) * newTotalPool)
}

/**
 * Numeric 예상 수익(정확값 기준 환원). 다른 베터가 모두 패배라고 가정한 상한치.
 * 실제 정산은 ±tolerance 안 모든 베터에게 amount 비례 분배되므로,
 * 미리보기에서는 단순히 "내 amount 비율로 전체 풀 환원"의 자기 자신 기준값을 표시.
 */
export function calcExpectedPayoutNumeric(amount: number, totalPool: number): number {
  if (amount <= 0) return 0
  // 새 total = 현재 풀 + 내 amount (자신만 winner라 가정 시 self-share = 1)
  return Math.floor(totalPool + amount)
}
