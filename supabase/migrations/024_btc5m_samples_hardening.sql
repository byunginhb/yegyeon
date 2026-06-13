-- ============================================================
-- 예견 (YEGYEON) — BTC 5분 가격 샘플링 코드리뷰 후속 보강
--   C1: sample_btc_price()의 http_get에 타임아웃 명시(업비트 행 시 cron 워커 적체 방지)
--   H1: 마이그레이션 자체 완결성 — http 익스텐션 보장
--   H2: open btc_5m 라운드 최대 1개 보장(샘플러/조회/베팅 라운드 일치)
--   M3: 샘플 테이블 적극적 autovacuum (10초 DELETE의 dead tuple 누적 대비)
-- ============================================================

create extension if not exists http with schema extensions;

-- C1: 타임아웃 명시한 샘플러
CREATE OR REPLACE FUNCTION public.sample_btc_price()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_market_id uuid;
  v_price     numeric;
BEGIN
  IF NOT pg_try_advisory_xact_lock(872025001) THEN
    RETURN;
  END IF;

  SELECT id INTO v_market_id FROM public.markets
    WHERE auto_kind = 'btc_5m' AND status = 'open'
    ORDER BY created_at DESC LIMIT 1;

  IF v_market_id IS NOT NULL THEN
    BEGIN
      -- 업비트 지연/행 시 락을 오래 쥐지 않도록 타임아웃 강제
      PERFORM http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '1000');
      PERFORM http_set_curlopt('CURLOPT_TIMEOUT_MS', '2500');
      SELECT (http_get('https://api.upbit.com/v1/ticker?markets=KRW-BTC')).content::json -> 0 ->> 'trade_price'
        INTO v_price;
    EXCEPTION WHEN others THEN
      v_price := NULL;
    END;

    IF v_price IS NOT NULL AND v_price > 0 THEN
      INSERT INTO public.btc_price_samples (market_id, price) VALUES (v_market_id, v_price);
    END IF;
  END IF;

  DELETE FROM public.btc_price_samples WHERE sampled_at < now() - interval '6 minutes';
END;
$$;

-- H2: auto_kind='btc_5m' AND status='open' 행은 최대 1개 (부분 유니크 인덱스)
CREATE UNIQUE INDEX IF NOT EXISTS uq_btc5m_single_open
  ON public.markets ((auto_kind))
  WHERE auto_kind = 'btc_5m' AND status = 'open';

-- M3: 작은 고빈도 DELETE 테이블 — autovacuum 적극화
ALTER TABLE public.btc_price_samples SET (
  autovacuum_vacuum_scale_factor = 0.0,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_scale_factor = 0.0,
  autovacuum_analyze_threshold = 100
);
