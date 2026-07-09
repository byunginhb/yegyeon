-- ============================================================
-- 예견 (YEGYEON) — 비트코인 5분 자동 마켓 기능 전면 제거
--   배경: 미사용 기능. pg_cron 수집(5분 라운드 + 10초 가격 샘플러)이 부하 유발,
--          누적된 자동 마켓 행(약 7,700개)이 markets 테이블을 크게 부풀림.
--   조치: 크론 해제 → 자동 마켓 데이터 삭제(cascade) → 전용 함수/테이블 제거.
--   보존: auto_kind/open_price/close_price 컬럼과 resolve_market의 자동마켓 가드는
--          휴면 인프라로 남겨둔다(참조 안전, 제거 시 정산 함수까지 손대야 함).
-- ============================================================

-- 1) pg_cron 잡 해제 (없을 수도 있으므로 멱등 처리)
SELECT cron.unschedule('btc-5m-round')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'btc-5m-round');
SELECT cron.unschedule('btc-5m-sample')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'btc-5m-sample');

-- 2) 자동 마켓 데이터 삭제 — FK CASCADE로 bets/comments/market_options/btc_price_samples 동반 정리
DELETE FROM public.markets WHERE auto_kind = 'btc_5m';

-- 3) 전용 함수 제거
DROP FUNCTION IF EXISTS public.run_btc_5m_round();
DROP FUNCTION IF EXISTS public.sample_btc_price();
DROP FUNCTION IF EXISTS public.place_btc5m_bet(uuid, uuid, text, integer, numeric);
DROP FUNCTION IF EXISTS public.settle_btc5m_round(uuid, uuid, text, numeric);

-- 4) 가격 샘플 테이블 제거
DROP TABLE IF EXISTS public.btc_price_samples;

-- 5) 자동 마켓 전용 인덱스 제거
DROP INDEX IF EXISTS public.uq_btc5m_single_open;
DROP INDEX IF EXISTS public.idx_markets_auto_kind;
