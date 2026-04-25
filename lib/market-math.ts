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
 * 베팅 후 새로운 확률 계산
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
 * 베팅으로 받게 되는 share 수 계산
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
 * 잠재적 수익 계산
 * 각 share는 해결 시 ₣1 가치
 */
export function calcPotentialPayout(
  shares: number,
  _outcome: 'YES' | 'NO'
): number {
  return shares
}
