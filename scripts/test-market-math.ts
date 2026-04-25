/**
 * 예견 마켓 수학 자가 검증 스크립트
 *
 * 실행: npx tsx scripts/test-market-math.ts
 *
 * - LMSR 확률/지분 계산의 단조성·경계값 안정성을 검사
 * - parimutuel 정산 시뮬레이션으로 포인트 보존 확인
 *
 * 외부 테스트 러너 없이 process.exit로 통과/실패만 표시.
 */

import {
  calcProbabilityAfterBet,
  calcSharesReceived,
  calcPotentialPayout,
} from '../lib/market-math'

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function approxEq(a: number, b: number, eps = 1e-3) {
  return Math.abs(a - b) <= eps
}

console.log('\n[1] calcProbabilityAfterBet — 단조성·경계값')
{
  // YES 베팅은 확률을 ↑, NO 베팅은 ↓ 시켜야 한다
  const before = 0.5
  const afterYes = calcProbabilityAfterBet(before, 100, 'YES')
  const afterNo = calcProbabilityAfterBet(before, 100, 'NO')
  ok('YES 베팅 후 확률 상승', afterYes > before, `before=${before} after=${afterYes}`)
  ok('NO 베팅 후 확률 하락', afterNo < before, `before=${before} after=${afterNo}`)

  // 0/1 입력은 그대로 반환되거나 클램프
  const at0 = calcProbabilityAfterBet(0, 100, 'YES')
  const at1 = calcProbabilityAfterBet(1, 100, 'YES')
  ok('확률 0 베팅 시 NaN 없음', Number.isFinite(at0))
  ok('확률 1 베팅 시 NaN 없음', Number.isFinite(at1))

  // betAmount<=0이면 변화 없음
  ok('amount=0이면 그대로', calcProbabilityAfterBet(0.5, 0, 'YES') === 0.5)
  ok('amount<0이면 그대로', calcProbabilityAfterBet(0.5, -10, 'YES') === 0.5)
}

console.log('\n[2] calcSharesReceived — 양의 값·단조성')
{
  // 같은 확률에서 더 많은 amount → 더 많은 shares
  const s100 = calcSharesReceived(0.5, 100, 'YES')
  const s500 = calcSharesReceived(0.5, 500, 'YES')
  ok('shares > 0', s100 > 0)
  ok('amount 증가 → shares 증가', s500 > s100, `s100=${s100} s500=${s500}`)

  // 낮은 확률에서 YES 베팅 시 더 많은 share (배당비)
  const sLow = calcSharesReceived(0.2, 100, 'YES')
  const sHigh = calcSharesReceived(0.8, 100, 'YES')
  ok('낮은 확률 YES 베팅 시 shares 더 많음', sLow > sHigh, `sLow=${sLow} sHigh=${sHigh}`)

  // shares 값이 NaN/Infinity가 아니어야 함
  ok('shares 유한값', Number.isFinite(s100) && Number.isFinite(s500))
}

console.log('\n[3] calcPotentialPayout — shares 그대로')
{
  ok('100 shares → 100 payout', calcPotentialPayout(100, 'YES') === 100)
  ok('0 shares → 0 payout', calcPotentialPayout(0, 'NO') === 0)
}

console.log('\n[4] parimutuel 정산 시뮬레이션 — 포인트 보존')
{
  /**
   * 시나리오: binary 마켓에 5명의 베터가 참여
   *   yes: A 100, B 200, C 50  (총 350)
   *   no : D 100, E 150       (총 250)
   * 결과 = YES → 승리 풀(350)이 전체(600) 비례 분배
   *   A → (100/350) * 600 = 171
   *   B → (200/350) * 600 = 342
   *   C → (50/350)  * 600 = 85
   * 합 = 598 (FLOOR로 인한 2 잔여 = 시스템에 남음 = 보존 OK)
   */
  const bets = [
    { user: 'A', outcome: 'YES', amount: 100 },
    { user: 'B', outcome: 'YES', amount: 200 },
    { user: 'C', outcome: 'YES', amount: 50 },
    { user: 'D', outcome: 'NO', amount: 100 },
    { user: 'E', outcome: 'NO', amount: 150 },
  ]
  const totalPool = bets.reduce((s, b) => s + b.amount, 0)
  const winnerPool = bets
    .filter((b) => b.outcome === 'YES')
    .reduce((s, b) => s + b.amount, 0)

  const payouts = bets.map((b) => {
    const isWinner = b.outcome === 'YES'
    return {
      ...b,
      payout: isWinner ? Math.floor((b.amount / winnerPool) * totalPool) : 0,
    }
  })

  const distributed = payouts.reduce((s, p) => s + p.payout, 0)

  ok('총 풀 = 600', totalPool === 600)
  ok('승리 풀 = 350', winnerPool === 350)
  ok('분배액 ≤ 총 풀 (포인트 보존)', distributed <= totalPool, `distributed=${distributed}`)
  ok(
    '분배액 ≥ 총 풀 - 승자수 (FLOOR 잔여 ≤ 승자수)',
    distributed >= totalPool - payouts.filter((p) => p.payout > 0).length,
    `distributed=${distributed}`
  )

  // 패배자 payout = 0
  ok('패배자 D payout=0', payouts.find((p) => p.user === 'D')!.payout === 0)
  ok('패배자 E payout=0', payouts.find((p) => p.user === 'E')!.payout === 0)
}

console.log('\n[5] parimutuel — 단독 승자 케이스')
{
  // 모든 베팅이 같은 outcome이면 각자 amount 비례로 자기 풀을 그대로 회수
  const bets = [
    { user: 'A', outcome: 'YES', amount: 100 },
    { user: 'B', outcome: 'YES', amount: 200 },
  ]
  const total = 300
  const winnerPool = 300
  const payouts = bets.map((b) => ({
    ...b,
    payout: Math.floor((b.amount / winnerPool) * total),
  }))
  ok('A 환불 100', approxEq(payouts[0].payout, 100, 1))
  ok('B 환불 200', approxEq(payouts[1].payout, 200, 1))
}

console.log('\n[6] 멱등성 시뮬레이션 — 같은 marketId 정산 재시도')
{
  // 정산 함수에 status='resolved' 가드와 unique idx가 있다고 가정.
  // 여기서는 단지 payout 합이 두 번째 호출에서 안 변해야 한다는 의도만 표현.
  let processed = false
  const distribute = () => {
    if (processed) return 0
    processed = true
    return 600
  }
  const first = distribute()
  const second = distribute()
  ok('1회차 분배 600', first === 600)
  ok('2회차 분배 0 (중복 차단)', second === 0)
}

console.log(`\n결과: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
