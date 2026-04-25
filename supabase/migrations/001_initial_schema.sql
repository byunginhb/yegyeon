-- ============================================================
-- 예견 (YEGYEON) — 초기 스키마 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

-- ============================================================
-- 1. ENUM 타입
-- ============================================================
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE market_type AS ENUM ('binary', 'multiple_choice', 'numeric');
CREATE TYPE market_status AS ENUM ('open', 'closed', 'resolved', 'cancelled');
CREATE TYPE point_tx_type AS ENUM ('signup_bonus', 'bet_placed', 'bet_won', 'bet_refund', 'admin_adjust', 'market_created');
CREATE TYPE report_type AS ENUM ('market', 'comment', 'user');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- ============================================================
-- 2. 사용자 테이블
-- ============================================================
CREATE TABLE public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid UNIQUE NOT NULL,
  username      text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  email         text UNIQUE NOT NULL,
  avatar_url    text,
  bio           text,
  points        integer NOT NULL DEFAULT 1000 CHECK (points >= 0),
  role          user_role NOT NULL DEFAULT 'user',
  is_banned     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. 카테고리
-- ============================================================
CREATE TABLE public.categories (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  icon       text NOT NULL,
  color      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.categories (name, slug, icon, color, sort_order) VALUES
  ('정치/사회', 'politics', '🏛️', '#6366f1', 1),
  ('IT/AI',    'tech',     '💻', '#06b6d4', 2),
  ('스포츠',   'sports',   '⚽', '#10b981', 3),
  ('연예/K-문화', 'culture', '🎤', '#f59e0b', 4),
  ('경제/금융', 'economy',  '📈', '#3b82f6', 5),
  ('국제',     'world',    '🌍', '#8b5cf6', 6),
  ('기타/재미', 'fun',      '🎲', '#ec4899', 7);

-- ============================================================
-- 4. 마켓
-- ============================================================
CREATE TABLE public.markets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  type            market_type NOT NULL,
  status          market_status NOT NULL DEFAULT 'open',
  creator_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  category_id     integer REFERENCES public.categories(id),

  close_date      timestamptz NOT NULL,
  resolved_at     timestamptz,
  resolution      text,

  total_volume    integer NOT NULL DEFAULT 0,
  unique_traders  integer NOT NULL DEFAULT 0,
  comment_count   integer NOT NULL DEFAULT 0,

  -- Binary 전용
  yes_probability float NOT NULL DEFAULT 0.5 CHECK (yes_probability BETWEEN 0 AND 1),
  yes_amount      integer NOT NULL DEFAULT 0,
  no_amount       integer NOT NULL DEFAULT 0,

  -- Numeric 전용
  min_value       float,
  max_value       float,
  unit            text,
  numeric_tolerance float DEFAULT 0.1,

  is_hidden       boolean NOT NULL DEFAULT false,
  tags            text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. 마켓 옵션 (Multiple Choice 전용)
-- ============================================================
CREATE TABLE public.market_options (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id    uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  text         text NOT NULL,
  color        text NOT NULL DEFAULT '#6366f1',
  probability  float NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 1),
  total_amount integer NOT NULL DEFAULT 0,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. 베팅
-- ============================================================
CREATE TABLE public.bets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_id   uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  option_id   uuid REFERENCES public.market_options(id),

  outcome     text NOT NULL,
  amount      integer NOT NULL CHECK (amount > 0),
  shares      float NOT NULL,
  payout      integer,

  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. 포인트 트랜잭션
-- ============================================================
CREATE TABLE public.point_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        point_tx_type NOT NULL,
  amount      integer NOT NULL,
  balance     integer NOT NULL,
  ref_id      uuid,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. 댓글
-- ============================================================
CREATE TABLE public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_id   uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. 팔로우
-- ============================================================
CREATE TABLE public.follows (
  follower_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================
-- 10. 신고
-- ============================================================
CREATE TABLE public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        report_type NOT NULL,
  target_id   uuid NOT NULL,
  reason      text NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. 공지사항
-- ============================================================
CREATE TABLE public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL,
  type        text NOT NULL DEFAULT 'banner',
  is_active   boolean NOT NULL DEFAULT true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. 관리 로그
-- ============================================================
CREATE TABLE public.admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. 서비스 설정
-- ============================================================
CREATE TABLE public.service_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_by  uuid REFERENCES public.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.service_settings (key, value, description) VALUES
  ('signup_bonus',        '1000', '신규 가입 지급 포인트'),
  ('market_creation_cost', '0',   '마켓 생성 비용 포인트'),
  ('min_bet_amount',       '10',  '최소 베팅 포인트'),
  ('initial_liquidity',    '100', 'Binary 마켓 초기 유동성');

-- ============================================================
-- 14. 인덱스
-- ============================================================
CREATE INDEX idx_markets_status       ON public.markets(status);
CREATE INDEX idx_markets_category     ON public.markets(category_id);
CREATE INDEX idx_markets_creator      ON public.markets(creator_id);
CREATE INDEX idx_markets_close_date   ON public.markets(close_date);
CREATE INDEX idx_markets_created_at   ON public.markets(created_at DESC);
CREATE INDEX idx_bets_user            ON public.bets(user_id);
CREATE INDEX idx_bets_market          ON public.bets(market_id);
CREATE INDEX idx_point_tx_user        ON public.point_transactions(user_id);
CREATE INDEX idx_point_tx_created     ON public.point_transactions(created_at DESC);
CREATE INDEX idx_comments_market      ON public.comments(market_id);
CREATE INDEX idx_reports_status       ON public.reports(status);

-- ============================================================
-- 15. 가입 트리거 (자동 포인트 지급)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_bonus    integer;
  v_username text;
  v_user_id  uuid;
BEGIN
  SELECT value::integer INTO v_bonus
  FROM public.service_settings WHERE key = 'signup_bonus';
  v_bonus := COALESCE(v_bonus, 1000);

  -- username: 이메일 앞부분 + id 앞 4자리
  v_username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4);

  INSERT INTO public.users (auth_id, username, display_name, email, points)
  VALUES (NEW.id, v_username, v_username, NEW.email, v_bonus)
  RETURNING id INTO v_user_id;

  INSERT INTO public.point_transactions (user_id, type, amount, balance, note)
  VALUES (v_user_id, 'signup_bonus', v_bonus, v_bonus, '가입 보너스');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 16. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_markets_updated_at
  BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 17. RLS 활성화
-- ============================================================
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_options      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_settings    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 18. RLS 정책
-- ============================================================

-- users
CREATE POLICY "users_select_all"   ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE
  USING (auth_id = auth.uid());

-- categories (공개 읽기)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (is_active = true);

-- markets
CREATE POLICY "markets_select_visible" ON public.markets FOR SELECT
  USING (
    is_hidden = false
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "markets_insert_auth" ON public.markets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "markets_update_creator_or_admin" ON public.markets FOR UPDATE
  USING (
    creator_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- market_options
CREATE POLICY "options_select_all" ON public.market_options FOR SELECT USING (true);
CREATE POLICY "options_insert_auth" ON public.market_options FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- bets
CREATE POLICY "bets_select_own_or_admin" ON public.bets FOR SELECT
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "bets_insert_auth" ON public.bets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- point_transactions
CREATE POLICY "pt_select_own_or_admin" ON public.point_transactions FOR SELECT
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- comments
CREATE POLICY "comments_select_visible" ON public.comments FOR SELECT
  USING (is_deleted = false);
CREATE POLICY "comments_insert_auth" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- follows
CREATE POLICY "follows_select_all"    ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_auth"   ON public.follows FOR INSERT
  WITH CHECK (follower_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "follows_delete_own"    ON public.follows FOR DELETE
  USING (follower_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- reports
CREATE POLICY "reports_select_admin"  ON public.reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'));
CREATE POLICY "reports_insert_auth"   ON public.reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- announcements
CREATE POLICY "announcements_select_active" ON public.announcements FOR SELECT
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- admin_logs
CREATE POLICY "admin_logs_select_admin" ON public.admin_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'));

-- service_settings
CREATE POLICY "settings_select_admin" ON public.service_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'));
