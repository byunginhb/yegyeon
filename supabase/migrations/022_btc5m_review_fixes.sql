-- ============================================================
-- 예견 (YEGYEON) — BTC 5분 동적배당 코드리뷰 후속 수정
--   M1: resolve_market에 자동마켓 가드 (parimutuel로 btc_5m 오정산 방지)
--   H1: place_btc5m_bet 가격 클램프 하한을 라우트/lib(0.05)와 일치
--   M3: settle_btc5m_round 로그에 total_stake 추가 (하우스 손익 감사)
-- ============================================================

-- ----------------------------------------------------------------
-- M1. resolve_market — 자동마켓 차단 가드 추가 (그 외 020과 동일)
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
         min_value, max_value, numeric_tolerance, auto_kind
    INTO v_market
    FROM public.markets
    WHERE id = p_market_id
    FOR UPDATE;

  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  -- 자동 마켓은 전용 정산(settle_btc5m_round)만 사용
  IF v_market.auto_kind IS NOT NULL THEN
    RAISE EXCEPTION 'USE_BTC5M_SETTLE' USING HINT = '자동 마켓은 전용 정산으로만 정산합니다.';
  END IF;
  IF v_market.status = 'resolved' THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED' USING HINT = '이미 정산 완료된 마켓입니다.';
  END IF;

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

  SELECT COALESCE(SUM(amount), 0) INTO v_total_pool
    FROM public.bets WHERE market_id = p_market_id;

  IF v_market.type = 'binary' THEN
    SELECT COALESCE(SUM(shares), 0), COUNT(*)
      INTO v_winner_pool, v_winners_count
      FROM public.bets
      WHERE market_id = p_market_id AND upper(outcome) = v_resolution;
  ELSIF v_market.type = 'multiple_choice' THEN
    SELECT COALESCE(SUM(shares), 0), COUNT(*)
      INTO v_winner_pool, v_winners_count
      FROM public.bets
      WHERE market_id = p_market_id AND outcome = v_resolution;
  ELSE
    DECLARE
      v_actual numeric := (v_resolution)::numeric;
      v_tol    numeric := COALESCE(v_market.numeric_tolerance, 0.1);
      v_range  numeric := GREATEST(ABS(v_actual), 1) * v_tol;
    BEGIN
      SELECT COALESCE(SUM(shares), 0), COUNT(*)
        INTO v_winner_pool, v_winners_count
        FROM public.bets
        WHERE market_id = p_market_id
          AND ABS((outcome)::numeric - v_actual) <= v_range;
    END;
  END IF;

  UPDATE public.markets
    SET status = 'resolved', resolution = v_resolution,
        resolved_at = now(), updated_at = now()
    WHERE id = p_market_id AND status <> 'resolved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED';
  END IF;

  IF v_winners_count = 0 THEN
    UPDATE public.bets SET payout = amount WHERE market_id = p_market_id;
    FOR v_bet IN
      SELECT user_id, SUM(amount)::bigint AS total
        FROM public.bets WHERE market_id = p_market_id GROUP BY user_id
    LOOP
      UPDATE public.users SET points = points + v_bet.total, updated_at = now()
        WHERE id = v_bet.user_id RETURNING points INTO v_user_balance;
      INSERT INTO public.point_transactions (user_id, type, amount, balance, ref_id, note)
      VALUES (v_bet.user_id, 'bet_refund', v_bet.total, v_user_balance, p_market_id, '승자 없음 — 전액 환불');
      v_distributed := v_distributed + v_bet.total;
    END LOOP;
  ELSE
    FOR v_bet IN
      SELECT b.id, b.shares, b.outcome FROM public.bets b
        WHERE b.market_id = p_market_id ORDER BY b.id
    LOOP
      DECLARE is_winner boolean := false;
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
          v_payout := FLOOR((v_bet.shares::numeric / v_winner_pool) * v_total_pool)::bigint;
        ELSE
          v_payout := 0;
        END IF;
        UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;
      END;
    END LOOP;

    FOR v_bet IN
      SELECT user_id, SUM(payout)::bigint AS total FROM public.bets
        WHERE market_id = p_market_id AND payout > 0 GROUP BY user_id
    LOOP
      UPDATE public.users SET points = points + v_bet.total, updated_at = now()
        WHERE id = v_bet.user_id RETURNING points INTO v_user_balance;
      INSERT INTO public.point_transactions (user_id, type, amount, balance, ref_id, note)
      VALUES (v_bet.user_id, 'bet_won', v_bet.total, v_user_balance, p_market_id,
              format('마켓 정산 승리: %s', v_resolution));
      v_distributed := v_distributed + v_bet.total;
    END LOOP;

    SELECT COUNT(*) INTO v_losers_count
      FROM public.bets WHERE market_id = p_market_id AND payout = 0;
  END IF;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, before_data, after_data)
  VALUES (v_admin_id, 'resolve_market', 'market', p_market_id,
          jsonb_build_object('status', v_market.status),
          jsonb_build_object('resolution', v_resolution, 'total_pool', v_total_pool,
                             'winners', v_winners_count, 'distributed', v_distributed));

  RETURN jsonb_build_object('market_id', p_market_id, 'resolution', v_resolution,
                            'total_pool', v_total_pool, 'winners_count', v_winners_count,
                            'losers_count', v_losers_count, 'distributed', v_distributed);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_market(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_market(uuid, uuid, text) TO service_role;

-- ----------------------------------------------------------------
-- H1. place_btc5m_bet — 가격 클램프 하한 0.05로(라우트/lib 일치)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_btc5m_bet(
  p_auth_id uuid, p_market_id uuid, p_outcome text, p_amount integer, p_price numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid; v_user_points integer; v_user_banned boolean;
  v_market record; v_min_bet integer; v_price numeric; v_shares float;
  v_new_balance integer; v_bet_id uuid; v_existing boolean; v_norm text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING HINT = '베팅 금액이 유효하지 않습니다.';
  END IF;
  v_norm := upper(p_outcome);
  IF v_norm NOT IN ('YES', 'NO') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;

  v_price := LEAST(0.97, GREATEST(0.05, p_price));

  SELECT COALESCE((value)::integer, 10) INTO v_min_bet
    FROM public.service_settings WHERE key = 'min_bet_amount';
  IF p_amount < v_min_bet THEN
    RAISE EXCEPTION 'BELOW_MIN_BET' USING HINT = format('최소 베팅 금액은 %s포인트입니다.', v_min_bet);
  END IF;

  SELECT id, points, is_banned INTO v_user_id, v_user_points, v_user_banned
    FROM public.users WHERE auth_id = p_auth_id FOR UPDATE;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF v_user_banned THEN RAISE EXCEPTION 'USER_BANNED'; END IF;
  IF v_user_points < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;

  SELECT id, status, close_date, yes_amount, no_amount, auto_kind INTO v_market
    FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF v_market.id IS NULL THEN RAISE EXCEPTION 'MARKET_NOT_FOUND'; END IF;
  IF v_market.auto_kind IS DISTINCT FROM 'btc_5m' THEN RAISE EXCEPTION 'NOT_BTC5M'; END IF;
  IF v_market.status <> 'open' OR v_market.close_date <= now() THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '이번 라운드는 마감됐습니다.';
  END IF;

  v_shares := p_amount / v_price;

  UPDATE public.users SET points = points - p_amount, updated_at = now()
    WHERE id = v_user_id RETURNING points INTO v_new_balance;

  SELECT EXISTS(SELECT 1 FROM public.bets WHERE market_id = p_market_id AND user_id = v_user_id)
    INTO v_existing;

  UPDATE public.markets
    SET yes_amount = yes_amount + CASE WHEN v_norm = 'YES' THEN p_amount ELSE 0 END,
        no_amount  = no_amount  + CASE WHEN v_norm = 'NO'  THEN p_amount ELSE 0 END,
        total_volume = total_volume + p_amount,
        unique_traders = unique_traders + CASE WHEN v_existing THEN 0 ELSE 1 END,
        yes_probability = GREATEST(0.01, LEAST(0.99,
          CASE WHEN v_norm = 'YES' THEN v_price ELSE 1 - v_price END)),
        updated_at = now()
    WHERE id = p_market_id;

  INSERT INTO public.bets (user_id, market_id, option_id, outcome, amount, shares, probability_at_bet)
  VALUES (v_user_id, p_market_id, NULL, v_norm, p_amount, v_shares, v_price)
  RETURNING id INTO v_bet_id;

  INSERT INTO public.point_transactions (user_id, type, amount, balance, ref_id, note)
  VALUES (v_user_id, 'bet_placed', -p_amount, v_new_balance, v_bet_id,
          format('BTC 5분 베팅: %s @ %s', v_norm, round(v_price, 2)));

  RETURN jsonb_build_object('bet_id', v_bet_id, 'price', v_price, 'shares', v_shares,
                            'potential_payout', floor(v_shares)::bigint, 'new_balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.place_btc5m_bet(uuid, uuid, text, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_btc5m_bet(uuid, uuid, text, integer, numeric) TO service_role;

-- ----------------------------------------------------------------
-- M3. settle_btc5m_round — admin_logs에 total_stake 추가
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_btc5m_round(
  p_admin_auth_id uuid, p_market_id uuid, p_resolution text, p_close_price numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid; v_admin_role text; v_status text; v_resolution text;
  v_row record; v_user_balance integer; v_distributed bigint := 0;
  v_winners integer := 0; v_total_stake bigint := 0;
BEGIN
  SELECT id, role INTO v_admin_id, v_admin_role
    FROM public.users WHERE auth_id = p_admin_auth_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  v_resolution := upper(trim(p_resolution));
  IF v_resolution NOT IN ('YES', 'NO') THEN RAISE EXCEPTION 'INVALID_RESOLUTION'; END IF;

  SELECT status INTO v_status FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'MARKET_NOT_FOUND'; END IF;
  IF v_status = 'resolved' THEN RAISE EXCEPTION 'ALREADY_RESOLVED'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_stake
    FROM public.bets WHERE market_id = p_market_id;

  UPDATE public.bets
    SET payout = CASE WHEN upper(outcome) = v_resolution THEN floor(shares)::bigint ELSE 0 END
    WHERE market_id = p_market_id;

  UPDATE public.markets
    SET status = 'resolved', resolution = v_resolution,
        close_price = p_close_price, resolved_at = now(), updated_at = now()
    WHERE id = p_market_id AND status <> 'resolved';
  IF NOT FOUND THEN RAISE EXCEPTION 'ALREADY_RESOLVED'; END IF;

  SELECT COUNT(*) INTO v_winners
    FROM public.bets WHERE market_id = p_market_id AND upper(outcome) = v_resolution;

  FOR v_row IN
    SELECT user_id, SUM(payout)::bigint AS total FROM public.bets
      WHERE market_id = p_market_id AND payout > 0 GROUP BY user_id
  LOOP
    UPDATE public.users SET points = points + v_row.total, updated_at = now()
      WHERE id = v_row.user_id RETURNING points INTO v_user_balance;
    INSERT INTO public.point_transactions (user_id, type, amount, balance, ref_id, note)
    VALUES (v_row.user_id, 'bet_won', v_row.total, v_user_balance, p_market_id,
            format('BTC 5분 정산 승리: %s', v_resolution));
    v_distributed := v_distributed + v_row.total;
  END LOOP;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, before_data, after_data)
  VALUES (v_admin_id, 'settle_btc5m', 'market', p_market_id,
          jsonb_build_object('status', v_status),
          jsonb_build_object('resolution', v_resolution, 'close_price', p_close_price,
                             'winners', v_winners, 'total_stake', v_total_stake,
                             'distributed', v_distributed,
                             'house_pnl', v_total_stake - v_distributed));

  RETURN jsonb_build_object('resolution', v_resolution, 'winners', v_winners,
                            'total_stake', v_total_stake, 'distributed', v_distributed);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_btc5m_round(uuid, uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_btc5m_round(uuid, uuid, text, numeric) TO service_role;
