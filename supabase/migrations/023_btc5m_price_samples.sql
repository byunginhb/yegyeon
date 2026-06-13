-- ============================================================
-- 예견 (YEGYEON) — 비트코인 5분 라운드 가격 샘플(롤링 5분 버퍼)
--   목적: 라운드 중간에 들어와도 그 시점까지의 실제 가격 흐름을 보여주기 위해
--          서버가 10초마다 업비트 현재가를 적재. 6분 지난 샘플은 자동 삭제(무한 누적 방지).
--   인프라: pg_cron 1.6(초 단위 스케줄) + http 익스텐션. 외부 서버 불필요.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.btc_price_samples (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  market_id   uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  price       numeric NOT NULL,
  sampled_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_btc_samples_market_time
  ON public.btc_price_samples(market_id, sampled_at);

ALTER TABLE public.btc_price_samples ENABLE ROW LEVEL SECURITY;
-- 공개 가격 데이터 — 누구나 조회 가능(서버는 service_role로 우회). 쓰기는 RPC(SECURITY DEFINER)만.
DROP POLICY IF EXISTS "btc_samples_select_all" ON public.btc_price_samples;
CREATE POLICY "btc_samples_select_all" ON public.btc_price_samples FOR SELECT USING (true);

-- 10초마다 호출되는 샘플러
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
  -- 동일 잡 오버랩 방지(업비트 지연 시) — 트랜잭션 종료 시 자동 해제
  IF NOT pg_try_advisory_xact_lock(872025001) THEN
    RETURN;
  END IF;

  SELECT id INTO v_market_id FROM public.markets
    WHERE auto_kind = 'btc_5m' AND status = 'open'
    ORDER BY created_at DESC LIMIT 1;

  -- 진행 중 라운드가 있으면 현재가 적재
  IF v_market_id IS NOT NULL THEN
    BEGIN
      SELECT (http_get('https://api.upbit.com/v1/ticker?markets=KRW-BTC')).content::json -> 0 ->> 'trade_price'
        INTO v_price;
    EXCEPTION WHEN others THEN
      v_price := NULL;
    END;

    IF v_price IS NOT NULL AND v_price > 0 THEN
      INSERT INTO public.btc_price_samples (market_id, price) VALUES (v_market_id, v_price);
    END IF;
  END IF;

  -- 롤링 정리: 6분 지난 샘플 삭제 (무한 누적 방지)
  DELETE FROM public.btc_price_samples WHERE sampled_at < now() - interval '6 minutes';
END;
$$;

-- 기존 잡 있으면 제거 후 재등록 (멱등)
SELECT cron.unschedule('btc-5m-sample')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'btc-5m-sample');

SELECT cron.schedule('btc-5m-sample', '10 seconds', $$SELECT public.sample_btc_price()$$);
