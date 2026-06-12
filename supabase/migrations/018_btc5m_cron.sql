-- ============================================================
-- 예견 (YEGYEON) — 비트코인 5분 등락 자동 마켓: 라운드 엔진 + pg_cron
-- 마이그레이션 018
--
-- 무료 인프라만 사용: Supabase pg_cron(5분 주기) + http 익스텐션(Upbit 가격).
-- 매 5분마다: 직전 라운드 자동 정산 → 새 라운드 생성. 외부 서버/도메인 의존 없음.
-- ============================================================

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- 한 라운드 사이클: 직전 라운드 정산 + 새 라운드 생성
create or replace function public.run_btc_5m_round()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_price          numeric;
  v_system_user_id uuid := '0b7c0000-0000-4000-a000-000000000001';
  v_system_auth_id uuid := '0b7c0000-0000-4000-a000-000000000002';
  v_category_id    integer := 5;  -- 경제/금융
  v_market         record;
  v_resolution     text;
begin
  -- 1) 업비트 KRW-BTC 현재가 조회 (실패 시 이번 라운드 스킵 — 라운드 깨짐 방지)
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

  -- 2) 진행 중이던 직전 라운드 정산 (시작가 대비 오르면 YES, 같거나 내리면 NO)
  for v_market in
    select id, open_price from public.markets
    where auto_kind = 'btc_5m' and status = 'open'
  loop
    update public.markets set close_price = v_price where id = v_market.id;
    v_resolution := case when v_price > v_market.open_price then 'YES' else 'NO' end;
    begin
      perform public.resolve_market(v_system_auth_id, v_market.id, v_resolution);
    exception when others then
      raise notice 'btc_5m: 정산 실패 market=% err=%', v_market.id, sqlerrm;
    end;
  end loop;

  -- 3) 새 라운드 생성 (진행 중 라운드가 없을 때만 — 중복 라운드 방지 안전장치)
  if not exists (
    select 1 from public.markets
    where auto_kind = 'btc_5m' and status = 'open'
  ) then
    insert into public.markets (
      title, description, type, status, creator_id, category_id,
      close_date, yes_probability, auto_kind, open_price, tags
    ) values (
      '비트코인, 5분 뒤 오를까?',
      '업비트 KRW-BTC 기준. 라운드 시작가 ' || to_char(v_price, 'FM999,999,999') ||
        '원 대비 5분 뒤 가격이 오르면 YES, 같거나 내리면 NO로 자동 정산됩니다.',
      'binary', 'open', v_system_user_id, v_category_id,
      now() + interval '5 minutes', 0.5, 'btc_5m', v_price,
      array['비트코인','5분','자동','실시간']
    );
  end if;
end;
$$;

-- 기존 동일 잡이 있으면 제거 후 재등록 (멱등)
select cron.unschedule('btc-5m-round')
where exists (select 1 from cron.job where jobname = 'btc-5m-round');

select cron.schedule('btc-5m-round', '*/5 * * * *', $$select public.run_btc_5m_round()$$);
