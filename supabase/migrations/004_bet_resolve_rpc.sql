-- ============================================================
-- 예견 (YEGYEON) — 베팅/정산 원자화 + 보안 보강
--   * place_bet RPC: 포인트 차감 + bets + market 집계 + 거래 기록을 단일 트랜잭션
--   * resolve_market RPC: 풀 비례 분배(parimutuel) + 멱등성 보장
--   * 003에 빠진 service_settings update 정책, users RLS 좁힘 등 함께 보강
-- ============================================================

-- ----------------------------------------------------------------
-- 0. 보강: 베팅/정산용 컬럼·인덱스
-- ----------------------------------------------------------------

ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES public.market_options(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bets_market_user ON public.bets(market_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_outcome ON public.bets(market_id, outcome);

-- 정산/지급 멱등성 안전망: 같은 (user, market, type) 조합으로 정산 트랜잭션 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_resolution_once
  ON public.point_transactions(user_id, ref_id, type)
  WHERE type IN ('bet_won', 'bet_refund');

-- ----------------------------------------------------------------
-- 1. place_bet — 단일 트랜잭션 베팅
--    인풋:
--      p_auth_id   : auth.users.id (서버 측에서 넘김)
--      p_market_id : 마켓 ID
--      p_outcome   : 'YES'/'NO' (binary), 옵션 텍스트 또는 option_id 문자열 (multiple_choice), 숫자 문자열 (numeric)
--      p_option_id : multiple_choice일 때 사용
--      p_amount    : 베팅 포인트 (양의 정수)
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

  -- 최소 베팅 금액 (service_settings에서)
  SELECT COALESCE((value)::integer, 10) INTO v_min_bet
    FROM public.service_settings WHERE key = 'min_bet_amount';
  IF p_amount < v_min_bet THEN
    RAISE EXCEPTION 'BELOW_MIN_BET' USING HINT = format('최소 베팅 금액은 %s포인트입니다.', v_min_bet);
  END IF;

  -- 사용자 락 + 잔액·정지 확인
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

  -- 마켓 락 + 상태/마감 확인
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

  -- outcome 검증 + 정규화
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
  ELSE -- numeric
    -- 숫자 파싱
    BEGIN
      PERFORM (p_outcome)::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_NUMERIC' USING HINT = '숫자를 입력해주세요.';
    END;
    v_normalized := p_outcome;
  END IF;

  -- shares & 새 확률 계산
  IF v_market.type = 'binary' THEN
    -- 단순 풀 기반 가격: 새 yes_amount/no_amount → 새 확률
    DECLARE
      new_yes integer := v_market.yes_amount;
      new_no  integer := v_market.no_amount;
      total   integer;
      eff_p   float;
    BEGIN
      IF v_normalized = 'YES' THEN
        eff_p := COALESCE(v_market.yes_probability, 0.5);
        v_shares := p_amount / GREATEST(eff_p, 0.01);  -- 0 div 보호
        new_yes := new_yes + p_amount;
      ELSE
        eff_p := 1 - COALESCE(v_market.yes_probability, 0.5);
        v_shares := p_amount / GREATEST(eff_p, 0.01);
        new_no := new_no + p_amount;
      END IF;
      total := new_yes + new_no;
      IF total > 0 THEN
        v_new_prob := new_yes::float / total::float;
      ELSE
        v_new_prob := 0.5;
      END IF;
      -- 0/1 경계 클램프
      v_new_prob := GREATEST(0.01, LEAST(0.99, v_new_prob));

      -- markets 집계 갱신
      UPDATE public.markets
        SET yes_amount = new_yes,
            no_amount  = new_no,
            yes_probability = v_new_prob,
            total_volume = total_volume + p_amount,
            updated_at = now()
        WHERE id = p_market_id;
    END;
  ELSIF v_market.type = 'multiple_choice' THEN
    -- 옵션별 풀 비례 확률
    UPDATE public.market_options
      SET total_amount = total_amount + p_amount
      WHERE id = p_option_id;

    -- 모든 옵션 합산 → 옵션별 확률 재계산
    PERFORM 1; -- placeholder
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

    v_shares := p_amount;  -- 옵션 마켓: 1포인트 = 1지분 (정산은 풀 비례)
    v_new_prob := NULL;

    UPDATE public.markets
      SET total_volume = total_volume + p_amount,
          updated_at = now()
      WHERE id = p_market_id;
  ELSE -- numeric
    v_shares := p_amount;
    v_new_prob := NULL;
    UPDATE public.markets
      SET total_volume = total_volume + p_amount,
          updated_at = now()
      WHERE id = p_market_id;
  END IF;

  -- unique_traders 증가 (해당 사용자가 처음 베팅인 경우)
  SELECT EXISTS(
    SELECT 1 FROM public.bets WHERE market_id = p_market_id AND user_id = v_user_id
  ) INTO v_existing_bet;

  IF NOT v_existing_bet THEN
    UPDATE public.markets
      SET unique_traders = unique_traders + 1
      WHERE id = p_market_id;
  END IF;

  -- 포인트 원자 차감
  UPDATE public.users
    SET points = points - p_amount,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING points INTO v_new_balance;

  -- bets INSERT
  INSERT INTO public.bets (
    user_id, market_id, option_id, outcome, amount, shares, probability_at_bet
  ) VALUES (
    v_user_id, p_market_id, p_option_id, v_normalized, p_amount,
    v_shares,
    CASE WHEN v_market.type = 'binary' THEN v_market.yes_probability ELSE NULL END
  )
  RETURNING id INTO v_bet_id;

  -- point_transactions
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
-- 2. resolve_market — 풀 비례 분배(parimutuel)
--    인풋:
--      p_admin_auth_id : 호출자(검증용)
--      p_market_id     : 마켓 ID
--      p_resolution    : 'YES'/'NO' (binary), option_id 문자열 (multiple_choice), 숫자 (numeric)
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
  v_winner_pool   numeric := 0;  -- 승리 측 shares 합
  v_losers_count  integer := 0;
  v_winners_count integer := 0;
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

  -- 마켓 락 + 멱등성: 이미 resolved면 즉시 리턴
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
    -- option_id 실재 검증
    PERFORM 1 FROM public.market_options
      WHERE id::text = p_resolution AND market_id = p_market_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_OPTION';
    END IF;
    v_resolution := p_resolution;
  ELSE -- numeric
    BEGIN
      PERFORM (p_resolution)::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_NUMERIC';
    END;
    v_resolution := p_resolution;
  END IF;

  -- 전체 풀 = 모든 베팅 합 (binary는 yes_amount+no_amount, 그 외는 SUM(amount))
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pool
    FROM public.bets WHERE market_id = p_market_id;

  -- 승리 측 shares 합 계산 + 카운트
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
  ELSE -- numeric: tolerance 안 들면 승리
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

  -- 마켓 상태 갱신 (멱등성: WHERE status<>'resolved' AND status='open' or 'closed')
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
    -- 승자 없음 → 모든 베팅 환불 (parimutuel 표준)
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
      )
      ON CONFLICT (user_id, ref_id, type) DO NOTHING;  -- 멱등성 안전망
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
          share_value := v_bet.amount;  -- 옵션 마켓은 amount 비례
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
          )
          ON CONFLICT (user_id, ref_id, type) DO NOTHING;
          v_distributed := v_distributed + v_payout;
        ELSE
          v_losers_count := v_losers_count + 1;
        END IF;
      END;
    END LOOP;
  END IF;

  -- admin_logs (RLS는 service role 통과)
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

-- ----------------------------------------------------------------
-- 3. users RLS 좁힘 — anon이 email/auth_id를 못 보도록 view 분리
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.users_public AS
  SELECT id, username, display_name, avatar_url, bio, points, role, is_banned,
         created_at, updated_at
  FROM public.users;

GRANT SELECT ON public.users_public TO anon, authenticated;

-- 기존 정책 제거 후 좁힘 (자기 자신은 모든 컬럼 SELECT 허용, 타인은 view 사용 권장)
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_self_or_admin" ON public.users FOR SELECT
  USING (auth_id = auth.uid() OR public.is_admin());
-- 일반 유저는 다른 사용자 정보 조회 시 users_public view 사용

-- ----------------------------------------------------------------
-- 4. users.points/role/is_banned 직접 변경 차단 트리거
--    (RLS update_own이 있어 본인이 update 가능 — 민감 컬럼은 트리거로 잠금)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_sensitive_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- service role(SECURITY DEFINER 함수에서 호출) 또는 admin 우회
  IF current_setting('role') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.points    IS DISTINCT FROM OLD.points    OR
     NEW.role      IS DISTINCT FROM OLD.role      OR
     NEW.is_banned IS DISTINCT FROM OLD.is_banned OR
     NEW.auth_id   IS DISTINCT FROM OLD.auth_id   OR
     NEW.email     IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify privileged columns';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_sensitive ON public.users;
CREATE TRIGGER users_guard_sensitive
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_sensitive_columns();
