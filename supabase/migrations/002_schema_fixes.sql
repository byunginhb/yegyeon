-- ============================================================
-- 예견 (YEGYEON) — 스키마 정합성 보완 마이그레이션
-- 검증 과정에서 발견된 누락 컬럼 및 함수 추가
-- ============================================================

-- markets 테이블에 slug 컬럼 추가 (존재하지 않는 경우)
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- markets 테이블에 comment_count 컬럼 추가 (존재하지 않는 경우)
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- markets 테이블에 resolution_criteria 컬럼 추가
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS resolution_criteria TEXT;

-- bets 테이블에 probability_at_bet 컬럼 추가
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS probability_at_bet DECIMAL(5,4);

-- point_tx_type enum에 'resolution' 값 추가 (존재하지 않는 경우)
ALTER TYPE point_tx_type ADD VALUE IF NOT EXISTS 'resolution';

-- comment_count 증가 함수 (increment_comment_count RPC)
CREATE OR REPLACE FUNCTION public.increment_comment_count(market_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.markets
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = market_id;
END;
$$;
