-- ============================================================
-- 예견 (YEGYEON) — 관리자 RLS 정책 보완
-- categories / announcements / admin_logs / service_settings / reports
-- 관리자 INSERT/UPDATE/DELETE 권한 추가
-- ============================================================

-- ----------------------------
-- 헬퍼: 현재 auth 유저가 admin인지 판정 (정책 가독성용)
-- ----------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

-- ----------------------------
-- categories: admin 전체 읽기 + INSERT/UPDATE/DELETE
-- (기존 select 정책은 is_active=true 한정 → admin은 비활성도 봐야 함)
-- ----------------------------
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_visible_or_admin" ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE
  USING (public.is_admin());

-- ----------------------------
-- comments: admin 삭제 권한 (현재 update만 본인)
-- ----------------------------
DROP POLICY IF EXISTS "comments_delete_admin" ON public.comments;
CREATE POLICY "comments_delete_admin" ON public.comments FOR DELETE
  USING (public.is_admin());

-- ----------------------------
-- markets: admin 삭제 권한
-- ----------------------------
DROP POLICY IF EXISTS "markets_delete_admin" ON public.markets;
CREATE POLICY "markets_delete_admin" ON public.markets FOR DELETE
  USING (public.is_admin());

-- ----------------------------
-- reports: admin UPDATE (status / reviewed_by / reviewed_at / note)
-- ----------------------------
DROP POLICY IF EXISTS "reports_update_admin" ON public.reports;
CREATE POLICY "reports_update_admin" ON public.reports FOR UPDATE
  USING (public.is_admin());

-- ----------------------------
-- announcements: admin INSERT/UPDATE/DELETE + admin 전체 SELECT
-- (기존: 활성 공지만 모두 SELECT 가능)
-- ----------------------------
DROP POLICY IF EXISTS "announcements_select_all_admin" ON public.announcements;
CREATE POLICY "announcements_select_all_admin" ON public.announcements FOR SELECT
  USING (public.is_admin());

CREATE POLICY "announcements_insert_admin" ON public.announcements FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "announcements_update_admin" ON public.announcements FOR UPDATE
  USING (public.is_admin());
CREATE POLICY "announcements_delete_admin" ON public.announcements FOR DELETE
  USING (public.is_admin());

-- ----------------------------
-- service_settings: admin UPDATE (INSERT는 시드/마이그레이션으로만)
-- ----------------------------
DROP POLICY IF EXISTS "settings_update_admin" ON public.service_settings;
CREATE POLICY "settings_update_admin" ON public.service_settings FOR UPDATE
  USING (public.is_admin());

-- ----------------------------
-- admin_logs: 서비스 롤만 INSERT (정책 미설정 → service role만 가능)
-- 명시적으로 INSERT 정책은 추가하지 않음 (RLS가 모든 anon/auth INSERT 차단)
-- ----------------------------

-- ----------------------------
-- users: admin UPDATE (정지/포인트 조정 — 현재는 service role 사용 중이지만 안전망)
-- ----------------------------
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE
  USING (public.is_admin());

-- ----------------------------
-- 추가 인덱스
-- ----------------------------
CREATE INDEX IF NOT EXISTS idx_admin_logs_created   ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin     ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target    ON public.admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_reports_created      ON public.reports(created_at DESC);
