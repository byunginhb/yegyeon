-- ============================================================
-- 예견 (YEGYEON) — 출석 보상 + 일일 퀘스트 시스템
-- 마이그레이션 011
-- ============================================================

-- ============================================================
-- 1. point_tx_type enum 확장 (attendance_bonus, quest_reward 추가)
-- ============================================================
ALTER TYPE point_tx_type ADD VALUE IF NOT EXISTS 'attendance_bonus';
ALTER TYPE point_tx_type ADD VALUE IF NOT EXISTS 'quest_reward';

-- ============================================================
-- 2. 출석 기록 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checked_date    date NOT NULL DEFAULT CURRENT_DATE,
  streak_count    int NOT NULL DEFAULT 1,
  points_earned   int NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, checked_date)
);

CREATE INDEX IF NOT EXISTS attendance_user_idx ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS attendance_user_date_idx ON public.attendance(user_id, checked_date DESC);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 출석만 조회" ON public.attendance;
CREATE POLICY "본인 출석만 조회"
  ON public.attendance
  FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- 관리자 전체 조회 허용
DROP POLICY IF EXISTS "attendance_admin_select" ON public.attendance;
CREATE POLICY "attendance_admin_select"
  ON public.attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 3. 일일 퀘스트 진행 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quest_type      text NOT NULL,
  quest_date      date NOT NULL DEFAULT CURRENT_DATE,
  completed_at    timestamptz,
  points_earned   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_type, quest_date)
);

CREATE INDEX IF NOT EXISTS quest_progress_user_date_idx
  ON public.user_quest_progress(user_id, quest_date);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 퀘스트만 조회" ON public.user_quest_progress;
CREATE POLICY "본인 퀘스트만 조회"
  ON public.user_quest_progress
  FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- 관리자 전체 조회 허용
DROP POLICY IF EXISTS "quest_progress_admin_select" ON public.user_quest_progress;
CREATE POLICY "quest_progress_admin_select"
  ON public.user_quest_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );
