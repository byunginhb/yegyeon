-- ============================================================
-- 예견 (YEGYEON) — 댓글 대댓글(답글) 지원
-- 마이그레이션 016
-- comments 테이블에 parent_id를 추가해 1단계 답글 스레드를 지원한다.
-- 부모 댓글이 하드 삭제되면 답글도 함께 삭제(CASCADE).
-- ============================================================

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- 부모 댓글 기준 답글 조회 최적화
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
