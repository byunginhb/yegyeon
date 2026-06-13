// 업비트 KRW-BTC 실시간 체결가 조회 (서버 전용)
// 베팅 확정처럼 최신가가 필요한 경로에서 사용. (위젯 표시 가격은 서버 샘플 테이블에서 도출)
export async function fetchBtcKrw(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.upbit.com/v1/ticker?markets=KRW-BTC',
      { cache: 'no-store', signal: AbortSignal.timeout(2500) }
    )
    if (!res.ok) return null
    const json = await res.json()
    const price = Array.isArray(json) ? Number(json[0]?.trade_price) : NaN
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}
