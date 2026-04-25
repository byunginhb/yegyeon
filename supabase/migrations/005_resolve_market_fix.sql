-- ============================================================
-- 예견 (YEGYEON) — resolve_market 함수 핫픽스
-- 문제: 004의 ON CONFLICT (user_id, ref_id, type) 가 partial unique index
--       (WHERE type IN ('bet_won','bet_refund'))와 매칭되지 않아 42P10 발생.
-- 수정: 함수 시작에서 markets.status='resolved' 단일 점유 UPDATE로
--       이미 멱등성을 보장하므로 ON CONFLICT 절을 제거.
--       partial unique index는 DB 차원의 안전망으로 유지.
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
  -- 관리자 검증
  SELECT id, role INTO v_admin_id, v_admin_role
    FROM public.users WHERE auth_id = p_admin_auth_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  -- 마켓 락 + 멱등성: 이미 resolved면 즉시 ALREADY_RESOLVED
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

  -- resolution 정규화 + 검증
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

  -- 승리 측 shares 합 + 카운트
  IF v_market.type = 'binary' THEN
    SELECT COALESCE(SUM(shares), 0), COUNT(*)
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

  -- 마켓 상태 점유 (race-free 멱등성). 이게 성공한 호출만 분배 진행.
  UPDATE public.markets
    SET status = 'resolved',
        resolution = v_resolution,
        resolved_at = now(),
        updated_at = now()
    WHERE id = p_market_id AND status <> 'resolved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED';
  END IF;

  -- 베팅 정산
  IF v_winners_count = 0 THEN
    -- 승자 없음 → 모든 베팅 환불
    FOR v_bet IN
      SELECT b.id, b.user_id, b.amount FROM public.bets b
      WHERE b.market_id = p_market_id
      ORDER BY b.id
    LOOP
      UPDATE public.bets SET payout = v_bet.amount WHERE id = v_bet.id;
      UPDATE public.users
        SET points = points + v_bet.amount, updated_at = now()
        WHERE id = v_bet.user_id
        RETURNING points INTO v_user_balance;
      INSERT INTO public.point_transactions (
        user_id, type, amount, balance, ref_id, note
      ) VALUES (
        v_bet.user_id, 'bet_refund', v_bet.amount, v_user_balance, p_market_id,
        '승자 없음 — 전액 환불'
      );
      v_distributed := v_distributed + v_bet.amount;
    END LOOP;
  ELSE
    -- 승자에게 풀 비례 분배
    FOR v_bet IN
      SELECT b.id, b.user_id, b.amount, b.shares, b.outcome
      FROM public.bets b
      WHERE b.market_id = p_market_id
      ORDER BY b.id
    LOOP
      DECLARE
        is_winner boolean := false;
        share_value numeric;
      BEGIN
        IF v_market.type = 'binary' THEN
          is_winner := upper(v_bet.outcome) = v_resolution;
          share_value := v_bet.shares;
        ELSIF v_market.type = 'multiple_choice' THEN
          is_winner := v_bet.outcome = v_resolution;
          share_value := v_bet.amount;
        ELSE
          DECLARE
            v_actual numeric := (v_resolution)::numeric;
            v_tol    numeric := COALESCE(v_market.numeric_tolerance, 0.1);
            v_range  numeric := GREATEST(ABS(v_actual), 1) * v_tol;
          BEGIN
            is_winner := ABS((v_bet.outcome)::numeric - v_actual) <= v_range;
            share_value := v_bet.amount;
          END;
        END IF;

        IF is_winner AND v_winner_pool > 0 THEN
          v_payout := FLOOR((share_value / v_winner_pool) * v_total_pool)::bigint;
        ELSE
          v_payout := 0;
        END IF;

        UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;

        IF v_payout > 0 THEN
          UPDATE public.users
            SET points = points + v_payout, updated_at = now()
            WHERE id = v_bet.user_id
            RETURNING points INTO v_user_balance;
          INSERT INTO public.point_transactions (
            user_id, type, amount, balance, ref_id, note
          ) VALUES (
            v_bet.user_id, 'bet_won', v_payout, v_user_balance, p_market_id,
            format('마켓 정산 승리: %s', v_resolution)
          );
          v_distributed := v_distributed + v_payout;
        ELSE
          v_losers_count := v_losers_count + 1;
        END IF;
      END;
    END LOOP;
  END IF;

  -- admin_logs
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

-- 함수 변경을 PostgREST schema cache에 즉시 반영
NOTIFY pgrst, 'reload schema';
