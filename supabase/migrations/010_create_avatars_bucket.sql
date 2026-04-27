-- avatars 스토리지 버킷 생성
-- 009_avatar_system.sql에서 "대시보드에서 직접 생성 필요"로 남겨둔 부분을 마이그레이션으로 처리
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
