// 비트코인 5분 등락 — 동적 배당(가격=확률) 책정
// 시작가 대비 현재가 + 남은시간으로 "상승이 이길 확률"을 추정하고,
// 그 확률에 하우스 엣지(vig)를 더해 베팅 '가격'을 만든다. 배당 = 1 / 가격.
// 막판이거나 가격이 크게 벌어질수록 유력한 쪽 가격이 1에 수렴 → 확정 베팅이 거의 무이득.

export const ROUND_SECONDS = 300

// 5분 상대 변동성 추정치(시작가 대비). BTC 5분 표준편차 ~0.15% 가정. 운영하며 튜닝.
const SIGMA = 0.0015
// 하우스 엣지(스프레드). 양쪽 가격 합 = 1 + 2*VIG. 헤지/시빌/wash 무위험 차익 차단 + 미스캘리브레이션 완충.
const VIG = 0.03
// 가격 클램프 — 배당이 0이나 무한이 되지 않도록.
const PRICE_FLOOR = 0.05
const PRICE_CEIL = 0.97

// 표준정규 누적분포 (Abramowitz-Stegun 7.1.26 근사)
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  let p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  if (z > 0) p = 1 - p
  return p
}

// 상승(YES)이 이길 원시 확률 (vig 미포함)
export function rawUpProbability(
  current: number,
  open: number,
  secondsRemaining: number
): number {
  if (!open || open <= 0) return 0.5
  const tau = Math.max(secondsRemaining, 1) / ROUND_SECONDS
  const relDelta = (current - open) / open
  const z = relDelta / (SIGMA * Math.sqrt(tau))
  return normCdf(z)
}

// 한 방향의 베팅 가격(=배당 역수). vig 포함 + 클램프.
export function sidePrice(
  outcome: 'YES' | 'NO',
  current: number,
  open: number,
  secondsRemaining: number
): number {
  const pUp = rawUpProbability(current, open, secondsRemaining)
  const p = outcome === 'YES' ? pUp : 1 - pUp
  return Math.min(PRICE_CEIL, Math.max(PRICE_FLOOR, p + VIG))
}

// 양쪽 가격을 한 번에 (UI 표시용)
export function bothPrices(
  current: number,
  open: number,
  secondsRemaining: number
): { up: number; down: number } {
  return {
    up: sidePrice('YES', current, open, secondsRemaining),
    down: sidePrice('NO', current, open, secondsRemaining),
  }
}
