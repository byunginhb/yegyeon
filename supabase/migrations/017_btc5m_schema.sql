-- ============================================================
-- 예견 (YEGYEON) — 비트코인 5분 등락 자동 마켓: 스키마 + 시스템 봇 유저
-- 마이그레이션 017
-- ============================================================

-- 자동 마켓 식별 + 가격 스냅샷 컬럼
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS auto_kind   text,      -- 'btc_5m' 등. NULL이면 일반(사용자) 마켓
  ADD COLUMN IF NOT EXISTS open_price  numeric,   -- 라운드 시작가
  ADD COLUMN IF NOT EXISTS close_price numeric;   -- 라운드 종료가(정산 시 기록)

-- 자동 마켓 조회 최적화 (진행 중 라운드 빠른 탐색)
CREATE INDEX IF NOT EXISTS idx_markets_auto_kind
  ON public.markets(auto_kind, status)
  WHERE auto_kind IS NOT NULL;

-- 시스템 봇 유저 — 자동 마켓의 생성자 겸 정산 주체.
-- resolve_market RPC가 role='admin'을 요구하므로 admin으로 생성한다.
INSERT INTO public.users (id, auth_id, username, display_name, email, role, points)
VALUES (
  '0b7c0000-0000-4000-a000-000000000001',
  '0b7c0000-0000-4000-a000-000000000002',
  'btc_oracle',
  '비트코인 5분봇',
  'btc-oracle@bot.yegyeon.internal',
  'admin',
  1000000
)
ON CONFLICT (id) DO NOTHING;
