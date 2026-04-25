-- 마켓 승인 시스템 2/2: 컬럼, 인덱스, RLS 정책
-- 007 마이그레이션의 ENUM 추가가 커밋된 후 실행되어야 함

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_markets_pending
  ON markets(created_at DESC) WHERE status = 'pending';

-- 기존 RLS SELECT 정책 교체: pending/rejected는 creator 또는 admin만 조회
DROP POLICY IF EXISTS "markets_select_visible" ON markets;

CREATE POLICY "markets_select_visible" ON markets
FOR SELECT
USING (
  (is_hidden = false AND status IN ('open', 'closed', 'resolved', 'cancelled'))
  OR creator_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
);
