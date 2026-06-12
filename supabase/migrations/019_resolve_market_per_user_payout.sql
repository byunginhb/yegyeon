-- ============================================================
-- 예견 (YEGYEON) — resolve_market 정산 버그 수정
--   문제: 한 유저가 같은 마켓에 여러 번 베팅 후 이기면(또는 승자 없음 환불 시),
--          승리/환불 point_transaction을 베팅마다 INSERT하다가
--          UNIQUE INDEX idx_pt_resolution_once(user_id, ref_id, type)에 걸려
--          정산 트랜잭션 전체가 롤백된다 → 마켓이 영원히 미정산.
--          (특히 비트코인 5분 마켓처럼 한 유저가 연타 베팅하면 빈번)
--   수정: 베팅별 payout 기록은 그대로 두되, 포인트 지급/환불과
--          point_transaction INSERT는 "유저별 1건"으로 합산 처리.
--          유저별 총 지급액·베팅별 payout 값은 기존과 동일(멱등 안전망과 일치).
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_market(
  p_admin_auth_id uuid,
  p_market_id     uuid,
  p_resolution    text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id      uuid;
  v_admin_role    text;
  v_market        record;
  v_resolution    text;
  v_total_pool    bigint := 0;
  v_winner_pool   numeric := 0;
  v_winners_count integer := 0;
  v_losers_count  integer := 0;
  v_bet           record;
  v_payout        bigint;
  v_user_balance  integer;
  v_distributed   bigint := 0;
BEGIN
  SELECT id, role INTO v_admin_id, v_admin_role
    FROM public.users WHERE auth_id = p_admin_auth_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT id, type, status, yes_amount, no_amount, total_volume,
         min_value, max_value, numeric_tolerance
    INTO v_market
    FROM public.markets
    WHERE id = p_market_id
    FOR UPDATE;

  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  IF v_market.status = 'resolved' THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED' USING HINT = '이미 정산 완료된 마켓입니다.';
  END IF;

  -- resolution 정규화/검증
  IF v_market.type = 'binary' THEN
    v_resolution := upper(trim(p_resolution));
    IF v_resolution NOT IN ('YES', 'NO') THEN
      RAISE EXCEPTION 'INVALID_RESOLUTION' USING HINT = 'YES/NO 중 선택';
    END IF;
  ELSIF v_market.type = 'multiple_choice' THEN
    PERFORM 1 FROM public.market_options
      WHERE id::text = p_resolution AND market_id = p_market_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_OPTION';
    END IF;
    v_resolution := p_resolution;
  ELSE
    BEGIN
      PERFORM (p_resolution)::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_NUMERIC';
    END;
    v_resolution := p_resolution;
  END IF;

  -- 전체 풀
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pool
    FROM public.bets WHERE market_id = p_market_id;

  -- 승리 측 amount 합 + 카운트
  IF v_market.type = 'binary' THEN
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
      INTO v_winner_pool, v_winners_count
      FROM public.bets
      WHERE market_id = p_market_id AND upper(outcome) = v_resolution;
  ELSIF v_market.type = 'multiple_choice' THEN
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
      INTO v_winner_pool, v_winners_count
      FROM public.bets
      WHERE market_id = p_market_id AND outcome = v_resolution;
  ELSE
    DECLARE
      v_actual numeric := (v_resolution)::numeric;
      v_tol    numeric := COALESCE(v_market.numeric_tolerance, 0.1);
      v_range  numeric := GREATEST(ABS(v_actual), 1) * v_tol;
    BEGIN
      SELECT COALESCE(SUM(amount), 0), COUNT(*)
        INTO v_winner_pool, v_winners_count
        FROM public.bets
        WHERE market_id = p_market_id
          AND ABS((outcome)::numeric - v_actual) <= v_range;
    END;
  END IF;

  -- status 점유 (race-free 멱등성)
  UPDATE public.markets
    SET status = 'resolved',
        resolution = v_resolution,
        resolved_at = now(),
        updated_at = now()
    WHERE id = p_market_id AND status <> 'resolved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED';
  END IF;

  IF v_winners_count = 0 THEN
    -- 승자 없음 → 전액 환불 (베팅별 payout 기록 후 유저별 1건 환불)
    UPDATE public.bets SET payout = amount WHERE market_id = p_market_id;

    FOR v_bet IN
      SELECT user_id, SUM(amount)::bigint AS total
        FROM public.bets
        WHERE market_id = p_market_id
        GROUP BY user_id
    LOOP
      UPDATE public.users
        SET points = points + v_bet.total, updated_at = now()
        WHERE id = v_bet.user_id
        RETURNING points INTO v_user_balance;
      INSERT INTO public.point_transactions (
        user_id, type, amount, balance, ref_id, note
      ) VALUES (
        v_bet.user_id, 'bet_refund', v_bet.total, v_user_balance, p_market_id,
        '승자 없음 — 전액 환불'
      );
      v_distributed := v_distributed + v_bet.total;
    END LOOP;
  ELSE
    -- 1) 베팅별 payout 계산/기록 (승패 판정 로직은 타입별 그대로 유지)
    FOR v_bet IN
      SELECT b.id, b.amount, b.outcome
        FROM public.bets b
        WHERE b.market_id = p_market_id
        ORDER BY b.id
    LOOP
      DECLARE
        is_winner boolean := false;
      BEGIN
        IF v_market.type = 'binary' THEN
          is_winner := upper(v_bet.outcome) = v_resolution;
        ELSIF v_market.type = 'multiple_choice' THEN
          is_winner := v_bet.outcome = v_resolution;
        ELSE
          DECLARE
            v_actual numeric := (v_resolution)::numeric;
            v_tol    numeric := COALESCE(v_market.numeric_tolerance, 0.1);
            v_range  numeric := GREATEST(ABS(v_actual), 1) * v_tol;
          BEGIN
            is_winner := ABS((v_bet.outcome)::numeric - v_actual) <= v_range;
          END;
        END IF;

        IF is_winner AND v_winner_pool > 0 THEN
          v_payout := FLOOR((v_bet.amount::numeric / v_winner_pool) * v_total_pool)::bigint;
        ELSE
          v_payout := 0;
        END IF;

        UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;
      END;
    END LOOP;

    -- 2) 유저별 지급 합산 (유저당 point_transaction 1건 → 멱등 인덱스와 일치)
    FOR v_bet IN
      SELECT user_id, SUM(payout)::bigint AS total
        FROM public.bets
        WHERE market_id = p_market_id AND payout > 0
        GROUP BY user_id
    LOOP
      UPDATE public.users
        SET points = points + v_bet.total, updated_at = now()
        WHERE id = v_bet.user_id
        RETURNING points INTO v_user_balance;
      INSERT INTO public.point_transactions (
        user_id, type, amount, balance, ref_id, note
      ) VALUES (
        v_bet.user_id, 'bet_won', v_bet.total, v_user_balance, p_market_id,
        format('마켓 정산 승리: %s', v_resolution)
      );
      v_distributed := v_distributed + v_bet.total;
    END LOOP;

    SELECT COUNT(*) INTO v_losers_count
      FROM public.bets WHERE market_id = p_market_id AND payout = 0;
  END IF;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, before_data, after_data)
  VALUES (
    v_admin_id, 'resolve_market', 'market', p_market_id,
    jsonb_build_object('status', v_market.status),
    jsonb_build_object(
      'resolution', v_resolution,
      'total_pool', v_total_pool,
      'winners', v_winners_count,
      'distributed', v_distributed
    )
  );

  RETURN jsonb_build_object(
    'market_id', p_market_id,
    'resolution', v_resolution,
    'total_pool', v_total_pool,
    'winners_count', v_winners_count,
    'losers_count', v_losers_count,
    'distributed', v_distributed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_market(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_market(uuid, uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
