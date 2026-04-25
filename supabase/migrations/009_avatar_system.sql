-- 프로필 사진 시스템
-- Storage avatars 버킷은 Supabase 대시보드에서 직접 생성 필요
-- (Public 버킷, 허용 MIME: image/jpeg, image/png, image/webp, 최대 2MB)

-- Storage RLS 정책 (버킷이 생성된 후 적용됨)
-- 읽기: 누구나
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 업로드/수정: 인증 사용자가 본인 폴더({user_id}/)에만
CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 파일만
CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- handle_new_user 트리거 수정: 카카오 프로필 사진 자동 저장
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_bonus      integer;
  v_username   text;
  v_user_id    uuid;
  v_avatar_url text;
BEGIN
  SELECT value::integer INTO v_bonus
  FROM public.service_settings WHERE key = 'signup_bonus';
  v_bonus := COALESCE(v_bonus, 1000);

  -- username: 이메일 앞부분 + id 앞 4자리
  v_username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4);

  -- 카카오 OAuth 프로필 사진 추출
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.users (auth_id, username, display_name, email, avatar_url, points)
  VALUES (NEW.id, v_username, v_username, NEW.email, v_avatar_url, v_bonus)
  RETURNING id INTO v_user_id;

  INSERT INTO public.point_transactions (user_id, type, amount, balance, note)
  VALUES (v_user_id, 'signup_bonus', v_bonus, v_bonus, '가입 보너스');

  RETURN NEW;
END;
$$;
