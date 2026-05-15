-- ============================================================
-- 예견 (YEGYEON) — 마켓 썸네일 + 다중 선택 옵션 이미지
-- 마이그레이션 013
-- ============================================================

-- 1. markets.thumbnail_url 추가
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2. market_options.image_url 추가
ALTER TABLE public.market_options
  ADD COLUMN IF NOT EXISTS image_url text;

-- 3. 'market-images' 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'market-images',
  'market-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. 버킷 RLS 정책
-- 읽기: 누구나 (public bucket)
DROP POLICY IF EXISTS "market_images_public_read" ON storage.objects;
CREATE POLICY "market_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'market-images');

-- 업로드: 인증 사용자가 본인 폴더({auth.uid()}/)에만
DROP POLICY IF EXISTS "market_images_auth_insert" ON storage.objects;
CREATE POLICY "market_images_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'market-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 수정: 본인 폴더만
DROP POLICY IF EXISTS "market_images_auth_update" ON storage.objects;
CREATE POLICY "market_images_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'market-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 폴더만 (관리자는 service_role로 우회)
DROP POLICY IF EXISTS "market_images_auth_delete" ON storage.objects;
CREATE POLICY "market_images_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'market-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
