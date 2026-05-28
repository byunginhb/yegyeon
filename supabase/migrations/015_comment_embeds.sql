-- ============================================================
-- 예견 (YEGYEON) — 댓글 URL OG 임베딩
-- 마이그레이션 015
-- 댓글 본문에 URL이 포함되면 첫 URL의 OG 메타데이터를 함께 저장한다.
-- ============================================================

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS embed_url         text,
  ADD COLUMN IF NOT EXISTS embed_title       text,
  ADD COLUMN IF NOT EXISTS embed_description text,
  ADD COLUMN IF NOT EXISTS embed_image       text;

-- 길이 가드: 비정상적으로 큰 임베드 데이터를 차단
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_embed_lengths_check;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_embed_lengths_check
  CHECK (
    (embed_url         IS NULL OR length(embed_url)         <= 2048) AND
    (embed_title       IS NULL OR length(embed_title)       <= 300)  AND
    (embed_description IS NULL OR length(embed_description) <= 500)  AND
    (embed_image       IS NULL OR length(embed_image)       <= 2048)
  );
