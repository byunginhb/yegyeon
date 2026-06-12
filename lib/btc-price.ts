// 업비트 KRW-BTC 실시간 체결가 조회 (서버 전용)
// 베팅 확정처럼 최신가가 필요한 경로에서 사용 (캐시 없음).
export async function fetchBtcKrw(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.upbit.com/v1/ticker?markets=KRW-BTC',
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return null
    const json = await res.json()
    const price = Array.isArray(json) ? Number(json[0]?.trade_price) : NaN
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

// 표시용 짧은 캐시(기본 2초). 위젯 폴링(클라이언트당 5초)이 업비트를 과도 호출하지 않도록 함.
// 인스턴스 단위 메모리 캐시 — 동시 폴링을 흡수하는 용도. 베팅엔 쓰지 않는다.
let _cache: { price: number; at: number } | null = null
let _inflight: Promise<number | null> | null = null

export async function fetchBtcKrwCached(ttlMs = 2000): Promise<number | null> {
  const nowMs = Date.now()
  if (_cache && nowMs - _cache.at < ttlMs) return _cache.price
  if (_inflight) return _inflight
  _inflight = (async () => {
    const price = await fetchBtcKrw()
    if (price != null) _cache = { price, at: Date.now() }
    _inflight = null
    return price ?? _cache?.price ?? null
  })()
  return _inflight
}
