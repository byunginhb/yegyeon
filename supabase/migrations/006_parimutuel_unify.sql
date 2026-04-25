-- ============================================================
-- 예견 (YEGYEON) — parimutuel 모델 통일
--   문제: place_bet은 LMSR-like shares(amount/p)를 저장하고,
--          resolve_market은 parimutuel로 분배 → 미리보기와 정산 결과 불일치.
--   수정: shares를 amount와 동일하게(=1포인트 1지분) 저장.
--          정산도 amount 비례로 분배. 클라이언트 미리보기와 100% 일치.
--   영향: 기존에 적은 확률에 베팅한 사람이 받던 share 가중 가산 사라짐.
--          데이터가 많지 않은 운영 전 시점이라 영향 최소.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. place_bet 재정의 — shares = amount (단순화)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_bet(
  p_auth_id   uuid,
  p_market_id uuid,
  p_outcome   text,
  p_option_id uuid,
  p_amount    integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_user_points  integer;
  v_user_banned  boolean;
  v_market       record;
  v_option       record;
  v_min_bet      integer;
  v_new_balance  integer;
  v_bet_id       uuid;
  v_existing_bet boolean;
  v_shares       float;
  v_new_prob     float;
  v_normalized   text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING HINT = '베팅 금액이 유효하지 않습니다.';
  END IF;

  SELECT COALESCE((value)::integer, 10) INTO v_min_bet
    FROM public.service_settings WHERE key = 'min_bet_amount';
  IF p_amount < v_min_bet THEN
    RAISE EXCEPTION 'BELOW_MIN_BET' USING HINT = format('최소 베팅 금액은 %s포인트입니다.', v_min_bet);
  END IF;

  SELECT id, points, is_banned
    INTO v_user_id, v_user_points, v_user_banned
    FROM public.users
    WHERE auth_id = p_auth_id
    FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING HINT = '사용자 프로필을 찾을 수 없습니다.';
  END IF;
  IF v_user_banned THEN
    RAISE EXCEPTION 'USER_BANNED' USING HINT = '정지된 계정입니다.';
  END IF;
  IF v_user_points < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS' USING HINT = '포인트가 부족합니다.';
  END IF;

  SELECT id, type, status, close_date, yes_probability,
         yes_amount, no_amount, total_volume, unique_traders, creator_id
    INTO v_market
    FROM public.markets
    WHERE id = p_market_id
    FOR UPDATE;

  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  IF v_market.status <> 'open' THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '이미 마감된 마켓입니다.';
  END IF;
  IF v_market.close_date <= now() THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '마감 시각이 지났습니다.';
  END IF;

  -- outcome 검증/정규화
  IF v_market.type = 'binary' THEN
    v_normalized := upper(p_outcome);
    IF v_normalized NOT IN ('YES', 'NO') THEN
      RAISE EXCEPTION 'INVALID_OUTCOME' USING HINT = 'binary 마켓은 YES/NO만 허용';
    END IF;
  ELSIF v_market.type = 'multiple_choice' THEN
    IF p_option_id IS NULL THEN
      RAISE EXCEPTION 'OPTION_REQUIRED' USING HINT = '옵션을 선택해주세요.';
    END IF;
    SELECT id, text INTO v_option
      FROM public.market_options
      WHERE id = p_option_id AND market_id = p_market_id
      FOR UPDATE;
    IF v_option.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_OPTION' USING HINT = '잘못된 옵션입니다.';
    END IF;
    v_normalized := v_option.id::text;
  ELSE
    BEGIN
      PERFORM (p_outcome)::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_NUMERIC' USING HINT = '숫자를 입력해주세요.';
    END;
    v_normalized := p_outcome;
  END IF;

  -- ★ shares = amount (parimutuel: 1포인트=1지분)
  v_shares := p_amount;

  -- 마켓 집계 갱신
  IF v_market.type = 'binary' THEN
    DECLARE
      new_yes integer := v_market.yes_amount;
      new_no  integer := v_market.no_amount;
      total   integer;
    BEGIN
      IF v_normalized = 'YES' THEN
        new_yes := new_yes + p_amount;
      ELSE
        new_no := new_no + p_amount;
      END IF;
      total := new_yes + new_no;
      IF total > 0 THEN
        v_new_prob := new_yes::float / total::float;
      ELSE
        v_new_prob := 0.5;
      END IF;
      v_new_prob := GREATEST(0.01, LEAST(0.99, v_new_prob));

      UPDATE public.markets
        SET yes_amount = new_yes,
            no_amount  = new_no,
            yes_probability = v_new_prob,
            total_volume = total_volume + p_amount,
            updated_at = now()
        WHERE id = p_market_id;
    END;
  ELSIF v_market.type = 'multiple_choice' THEN
    UPDATE public.market_options
      SET total_amount = total_amount + p_amount
      WHERE id = p_option_id;

    UPDATE public.market_options mo
      SET probability = CASE
        WHEN total_sum.s > 0 THEN mo.total_amount::float / total_sum.s::float
        ELSE 0
      END
      FROM (
        SELECT SUM(total_amount)::float AS s
          FROM public.market_options
          WHERE market_id = p_market_id
      ) total_sum
      WHERE mo.market_id = p_market_id;

    v_new_prob := NULL;

    UPDATE public.markets
      SET total_volume = total_volume + p_amount,
          updated_at = now()
      WHERE id = p_market_id;
  ELSE
    v_new_prob := NULL;
    UPDATE public.markets
      SET total_volume = total_volume + p_amount,
          updated_at = now()
      WHERE id = p_market_id;
  END IF;

  -- unique_traders
  SELECT EXISTS(
    SELECT 1 FROM public.bets WHERE market_id = p_market_id AND user_id = v_user_id
  ) INTO v_existing_bet;

  IF NOT v_existing_bet THEN
    UPDATE public.markets
      SET unique_traders = unique_traders + 1
      WHERE id = p_market_id;
  END IF;

  -- 포인트 차감
  UPDATE public.users
    SET points = points - p_amount,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING points INTO v_new_balance;

  -- bets INSERT (shares = amount)
  INSERT INTO public.bets (
    user_id, market_id, option_id, outcome, amount, shares, probability_at_bet
  ) VALUES (
    v_user_id, p_market_id, p_option_id, v_normalized, p_amount,
    v_shares,
    CASE WHEN v_market.type = 'binary' THEN v_market.yes_probability ELSE NULL END
  )
  RETURNING id INTO v_bet_id;

  INSERT INTO public.point_transactions (
    user_id, type, amount, balance, ref_id, note
  ) VALUES (
    v_user_id, 'bet_placed', -p_amount, v_new_balance, v_bet_id,
    format('마켓 베팅: %s %s포인트', v_normalized, p_amount)
  );

  RETURN jsonb_build_object(
    'bet_id', v_bet_id,
    'shares', v_shares,
    'new_probability', v_new_prob,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_bet(uuid, uuid, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_bet(uuid, uuid, text, uuid, integer) TO service_role;

-- ----------------------------------------------------------------
-- 2. resolve_market 재정의 — share_value = amount (parimutuel 통일)
-- ----------------------------------------------------------------
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
  v_winner_pool   numeric := 0;  -- 승리 측 amount 합
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

  -- 승리 측 amount 합 + 카운트 (★ shares가 아닌 amount 기반)
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

  -- 정산
  IF v_winners_count = 0 THEN
    -- 승자 없음 → 전액 환불
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
    -- 승자에게 amount 비례 분배
    FOR v_bet IN
      SELECT b.id, b.user_id, b.amount, b.outcome
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
