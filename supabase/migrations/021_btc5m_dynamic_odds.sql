-- ============================================================
-- 예견 (YEGYEON) — 비트코인 5분 마켓: 시간감쇠 parimutuel → 동적 배당(fixed-odds) 전환
--   배경: 시간감쇠 parimutuel은 단독 승자가 풀을 독식(weight 약분)하는 치명적 결함이 있어
--          막판 정보우위 악용을 막지 못함(검증 에이전트 확인).
--   전환: btc_5m은 '가격=확률' 동적 배당으로. 시스템(하우스)이 카운터파티.
--          베팅 시점 가격(서버가 라이브 BTC가+남은시간으로 산정)으로 shares=금액/가격 고정.
--          정산은 풀 분배가 아니라 승리 shares×1 지급(하우스 뱅킹).
--   분리: 일반 parimutuel place_bet/resolve_market은 자동마켓을 더 이상 다루지 않는다.
--          자동마켓 직접(parimutuel) 베팅은 차단 → 전용 위젯(place_btc5m_bet)으로만.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. place_bet — 자동마켓 직접 베팅 차단 + shares=amount(감쇠 제거, parimutuel 원복)
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
         yes_amount, no_amount, total_volume, unique_traders, creator_id,
         auto_kind
    INTO v_market
    FROM public.markets
    WHERE id = p_market_id
    FOR UPDATE;

  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  -- 자동 마켓(BTC 5분 등)은 동적 배당 전용 경로(place_btc5m_bet)로만 베팅
  IF v_market.auto_kind IS NOT NULL THEN
    RAISE EXCEPTION 'AUTO_MARKET_BET_BLOCKED' USING HINT = '자동 마켓은 전용 위젯에서만 베팅할 수 있습니다.';
  END IF;
  IF v_market.status <> 'open' THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '이미 마감된 마켓입니다.';
  END IF;
  IF v_market.close_date <= now() THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '마감 시각이 지났습니다.';
  END IF;

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

  v_shares := p_amount;  -- parimutuel: 1포인트 = 1지분

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

  SELECT EXISTS(
    SELECT 1 FROM public.bets WHERE market_id = p_market_id AND user_id = v_user_id
  ) INTO v_existing_bet;

  IF NOT v_existing_bet THEN
    UPDATE public.markets
      SET unique_traders = unique_traders + 1
      WHERE id = p_market_id;
  END IF;

  UPDATE public.users
    SET points = points - p_amount, updated_at = now()
    WHERE id = v_user_id
    RETURNING points INTO v_new_balance;

  INSERT INTO public.bets (
    user_id, market_id, option_id, outcome, amount, shares, probability_at_bet
  ) VALUES (
    v_user_id, p_market_id, p_option_id, v_normalized, p_amount, v_shares,
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
    'bet_id', v_bet_id, 'shares', v_shares,
    'new_probability', v_new_prob, 'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_bet(uuid, uuid, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_bet(uuid, uuid, text, uuid, integer) TO service_role;

-- ----------------------------------------------------------------
-- 2. place_btc5m_bet — 동적 배당 베팅. p_price는 서버(라우트)가 라이브가로 산정해 전달.
--    shares = 금액 / 가격. 적중 시 floor(shares) 지급(하우스 뱅킹).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_btc5m_bet(
  p_auth_id   uuid,
  p_market_id uuid,
  p_outcome   text,
  p_amount    integer,
  p_price     numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_user_points integer;
  v_user_banned boolean;
  v_market      record;
  v_min_bet     integer;
  v_price       numeric;
  v_shares      float;
  v_new_balance integer;
  v_bet_id      uuid;
  v_existing    boolean;
  v_norm        text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING HINT = '베팅 금액이 유효하지 않습니다.';
  END IF;

  v_norm := upper(p_outcome);
  IF v_norm NOT IN ('YES', 'NO') THEN
    RAISE EXCEPTION 'INVALID_OUTCOME';
  END IF;

  -- 가격 방어적 클램프 (배당 1.03x ~ 50x)
  v_price := LEAST(0.97, GREATEST(0.02, p_price));

  SELECT COALESCE((value)::integer, 10) INTO v_min_bet
    FROM public.service_settings WHERE key = 'min_bet_amount';
  IF p_amount < v_min_bet THEN
    RAISE EXCEPTION 'BELOW_MIN_BET' USING HINT = format('최소 베팅 금액은 %s포인트입니다.', v_min_bet);
  END IF;

  SELECT id, points, is_banned INTO v_user_id, v_user_points, v_user_banned
    FROM public.users WHERE auth_id = p_auth_id FOR UPDATE;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  IF v_user_banned THEN
    RAISE EXCEPTION 'USER_BANNED';
  END IF;
  IF v_user_points < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;

  SELECT id, status, close_date, yes_amount, no_amount, auto_kind
    INTO v_market
    FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  IF v_market.auto_kind IS DISTINCT FROM 'btc_5m' THEN
    RAISE EXCEPTION 'NOT_BTC5M';
  END IF;
  IF v_market.status <> 'open' OR v_market.close_date <= now() THEN
    RAISE EXCEPTION 'MARKET_CLOSED' USING HINT = '이번 라운드는 마감됐습니다.';
  END IF;

  v_shares := p_amount / v_price;  -- 적중 시 받을 지분(1지분=1포인트)

  UPDATE public.users
    SET points = points - p_amount, updated_at = now()
    WHERE id = v_user_id RETURNING points INTO v_new_balance;

  SELECT EXISTS(SELECT 1 FROM public.bets WHERE market_id = p_market_id AND user_id = v_user_id)
    INTO v_existing;

  -- 집계: 총 베팅액(yes_amount/no_amount) + 거래량/참여자 + 표시용 확률(상승가 기준)
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

  RETURN jsonb_build_object(
    'bet_id', v_bet_id,
    'price', v_price,
    'shares', v_shares,
    'potential_payout', floor(v_shares)::bigint,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_btc5m_bet(uuid, uuid, text, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_btc5m_bet(uuid, uuid, text, integer, numeric) TO service_role;

-- ----------------------------------------------------------------
-- 3. settle_btc5m_round — 고정배당 정산(하우스 뱅킹). 승리 shares×1 지급, 유저당 1건.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_btc5m_round(
  p_admin_auth_id uuid,
  p_market_id     uuid,
  p_resolution    text,
  p_close_price   numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id    uuid;
  v_admin_role  text;
  v_status      text;
  v_resolution  text;
  v_row         record;
  v_user_balance integer;
  v_distributed bigint := 0;
  v_winners     integer := 0;
BEGIN
  SELECT id, role INTO v_admin_id, v_admin_role
    FROM public.users WHERE auth_id = p_admin_auth_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  v_resolution := upper(trim(p_resolution));
  IF v_resolution NOT IN ('YES', 'NO') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION';
  END IF;

  SELECT status INTO v_status FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  IF v_status = 'resolved' THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED';
  END IF;

  -- 베팅별 payout = 적중이면 floor(shares), 아니면 0
  UPDATE public.bets
    SET payout = CASE WHEN upper(outcome) = v_resolution THEN floor(shares)::bigint ELSE 0 END
    WHERE market_id = p_market_id;

  UPDATE public.markets
    SET status = 'resolved', resolution = v_resolution,
        close_price = p_close_price, resolved_at = now(), updated_at = now()
    WHERE id = p_market_id AND status <> 'resolved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_RESOLVED';
  END IF;

  SELECT COUNT(*) INTO v_winners
    FROM public.bets WHERE market_id = p_market_id AND upper(outcome) = v_resolution;

  -- 유저별 합산 지급 (유저당 bet_won 1건 → 멱등 인덱스 충족)
  FOR v_row IN
    SELECT user_id, SUM(payout)::bigint AS total
      FROM public.bets
      WHERE market_id = p_market_id AND payout > 0
      GROUP BY user_id
  LOOP
    UPDATE public.users
      SET points = points + v_row.total, updated_at = now()
      WHERE id = v_row.user_id
      RETURNING points INTO v_user_balance;
    INSERT INTO public.point_transactions (user_id, type, amount, balance, ref_id, note)
    VALUES (v_row.user_id, 'bet_won', v_row.total, v_user_balance, p_market_id,
            format('BTC 5분 정산 승리: %s', v_resolution));
    v_distributed := v_distributed + v_row.total;
  END LOOP;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, before_data, after_data)
  VALUES (v_admin_id, 'settle_btc5m', 'market', p_market_id,
          jsonb_build_object('status', v_status),
          jsonb_build_object('resolution', v_resolution, 'close_price', p_close_price,
                             'winners', v_winners, 'distributed', v_distributed));

  RETURN jsonb_build_object('resolution', v_resolution, 'winners', v_winners, 'distributed', v_distributed);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_btc5m_round(uuid, uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_btc5m_round(uuid, uuid, text, numeric) TO service_role;

-- ----------------------------------------------------------------
-- 4. run_btc_5m_round — 정산을 settle_btc5m_round(고정배당)로 전환
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_btc_5m_round()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_price          numeric;
  v_system_user_id uuid := '0b7c0000-0000-4000-a000-000000000001';
  v_system_auth_id uuid := '0b7c0000-0000-4000-a000-000000000002';
  v_category_id    integer := 5;
  v_market         record;
  v_resolution     text;
begin
  begin
    select (http_get('https://api.upbit.com/v1/ticker?markets=KRW-BTC')).content::json -> 0 ->> 'trade_price'
      into v_price;
  exception when others then
    v_price := null;
  end;

  if v_price is null or v_price <= 0 then
    raise notice 'btc_5m: 가격 조회 실패 — 라운드 스킵';
    return;
  end if;

  -- 직전 라운드 정산 (고정배당)
  for v_market in
    select id, open_price from public.markets
    where auto_kind = 'btc_5m' and status = 'open'
  loop
    v_resolution := case when v_price > v_market.open_price then 'YES' else 'NO' end;
    begin
      perform public.settle_btc5m_round(v_system_auth_id, v_market.id, v_resolution, v_price);
    exception when others then
      raise notice 'btc_5m: 정산 실패 market=% err=%', v_market.id, sqlerrm;
    end;
  end loop;

  -- 새 라운드 (진행 중 없을 때만)
  if not exists (
    select 1 from public.markets where auto_kind = 'btc_5m' and status = 'open'
  ) then
    insert into public.markets (
      title, description, type, status, creator_id, category_id,
      close_date, yes_probability, auto_kind, open_price, tags
    ) values (
      '비트코인, 5분 뒤 오를까?',
      '업비트 KRW-BTC 기준. 라운드 시작가 ' || to_char(v_price, 'FM999,999,999') ||
        '원 대비 5분 뒤 가격이 오르면 상승(YES), 같거나 내리면 하락(NO). 동적 배당(가격=확률)으로 정산됩니다.',
      'binary', 'open', v_system_user_id, v_category_id,
      now() + interval '5 minutes', 0.5, 'btc_5m', v_price,
      array['비트코인','5분','자동','실시간']
    );
  end if;
end;
$$;
