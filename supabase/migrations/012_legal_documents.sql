-- ============================================================
-- 예견 (YEGYEON) — 약관 문서 (서비스 약관 / 개인정보 처리방침 / 이용 약관)
-- 마이그레이션 012
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL UNIQUE
              CHECK (kind IN ('terms_of_service', 'privacy_policy', 'terms_of_use')),
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  version     int  NOT NULL DEFAULT 1,
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_documents_kind_idx ON public.legal_documents(kind);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_documents_select_all" ON public.legal_documents;
CREATE POLICY "legal_documents_select_all"
  ON public.legal_documents
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "legal_documents_admin_write" ON public.legal_documents;
CREATE POLICY "legal_documents_admin_write"
  ON public.legal_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- 기본 문서 시드 (초기 1회만 — 이미 존재하면 변경하지 않음)
INSERT INTO public.legal_documents (kind, title, content)
VALUES
  (
    'terms_of_service',
    '서비스 약관',
    E'# 예견(YEGYEON) 서비스 약관\n\n## 제1조 (목적)\n본 약관은 예견(이하 "회사")이 제공하는 예측 시장 서비스(이하 "서비스") 이용에 관한 조건과 절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n## 제2조 (용어의 정의)\n- "서비스"란 회사가 제공하는 한국형 예측 시장 플랫폼 및 부수 서비스를 의미합니다.\n- "회원"이란 본 약관에 동의하고 서비스 이용 자격을 부여받은 자를 말합니다.\n- "포인트(₣)"란 서비스 내에서만 사용되는 가상의 사이버머니로, 실제 화폐 가치를 가지지 않습니다.\n\n## 제3조 (약관의 효력 및 변경)\n1. 본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.\n2. 회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 변경 사유 및 적용일자를 명시하여 사전 공지합니다.\n\n## 제4조 (서비스의 제공)\n회사는 회원에게 마켓 생성, 베팅, 정산, 리더보드 등 예측 시장 관련 기능을 제공합니다.\n\n## 제5조 (회원의 의무)\n회원은 다음 행위를 하여서는 안 됩니다.\n- 타인의 정보 도용\n- 서비스 운영을 방해하는 행위\n- 법령 또는 공서양속에 반하는 행위\n\n## 제6조 (포인트의 성격)\n포인트는 서비스 내 가상 화폐로, 현금 환전이 불가능하며 양도·증여·매매할 수 없습니다.\n\n## 제7조 (면책)\n예측 결과는 집단 지성에 따른 확률 추정이며, 회사는 그 결과의 정확성에 대해 책임지지 않습니다.\n\n## 부칙\n본 약관은 2026년 4월 1일부터 시행합니다.'
  ),
  (
    'privacy_policy',
    '개인정보 처리방침',
    E'# 예견(YEGYEON) 개인정보 처리방침\n\n예견(이하 "회사")은 「개인정보 보호법」 등 관련 법령을 준수하며, 회원의 개인정보를 다음과 같이 처리합니다.\n\n## 1. 수집하는 개인정보 항목\n- 필수 항목: 이메일, 닉네임, 카카오 계정 식별자\n- 자동 수집: 접속 IP, 쿠키, 서비스 이용 기록, 기기 정보\n\n## 2. 개인정보의 수집·이용 목적\n- 회원 가입 및 본인 식별\n- 서비스 제공 및 운영\n- 부정 이용 방지 및 보안\n- 통계 및 서비스 개선\n\n## 3. 개인정보의 보유 및 이용 기간\n원칙적으로 회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 안전하게 보관 후 파기합니다.\n\n## 4. 개인정보의 제3자 제공\n회사는 회원의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.\n\n## 5. 개인정보의 처리 위탁\n원활한 서비스 제공을 위해 Supabase, Vercel 등 인프라 사업자에게 데이터 저장 및 호스팅을 위탁하고 있습니다.\n\n## 6. 회원의 권리\n회원은 언제든지 자신의 개인정보 조회, 수정, 삭제, 처리 정지를 요구할 수 있습니다.\n\n## 7. 쿠키의 운영\n회사는 로그인 유지 및 서비스 개선을 위해 쿠키를 사용합니다. 회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.\n\n## 8. 개인정보 보호책임자\n- 이메일: privacy@yegyeon.kr (예시)\n\n## 부칙\n본 방침은 2026년 4월 1일부터 적용됩니다.'
  ),
  (
    'terms_of_use',
    '이용 약관',
    E'# 예견(YEGYEON) 이용 약관\n\n본 이용 약관은 회원이 서비스를 이용함에 있어 준수해야 하는 세부 규칙을 정합니다.\n\n## 1. 계정\n- 회원은 1인 1계정을 원칙으로 합니다.\n- 회원은 자신의 계정 정보를 안전하게 관리해야 하며, 계정 관리 소홀로 인한 손해는 회원이 부담합니다.\n\n## 2. 마켓 생성 및 베팅\n- 누구나 마켓을 생성할 수 있으며, 마켓 생성 시 일정량의 포인트가 차감될 수 있습니다.\n- 베팅은 본인의 의사에 따라 자유롭게 이루어지며, 베팅 후 취소·환불은 원칙적으로 불가합니다.\n- 마켓 정산은 정해진 기준에 따라 자동 또는 관리자에 의해 수행됩니다.\n\n## 3. 포인트\n- 신규 가입 시 웰컴 보너스가 지급될 수 있습니다.\n- 포인트는 실제 화폐 가치를 가지지 않으며, 현금화·환전·양도가 불가합니다.\n- 부정한 방법으로 포인트를 취득한 경우 회수될 수 있습니다.\n\n## 4. 금지 행위\n다음 행위는 즉시 제재(경고/이용 정지/영구 탈퇴) 대상이 됩니다.\n- 다중 계정 운영\n- 자동화 도구를 이용한 베팅\n- 시장 조작 또는 담합\n- 타인의 권리 침해\n- 욕설, 혐오 표현, 음란물 게시\n\n## 5. 콘텐츠 책임\n회원이 작성한 마켓 질문, 댓글, 프로필 정보 등은 작성자에게 귀속되며, 관련 책임도 작성자에게 있습니다.\n\n## 6. 서비스 변경 및 중단\n회사는 서비스의 일부 또는 전부를 변경, 중단할 수 있으며 중요한 변경 사항은 사전에 공지합니다.\n\n## 7. 분쟁 해결\n본 약관 및 서비스 이용에 관한 분쟁은 대한민국 법령에 따르며, 회사 본사 소재지 관할 법원을 1심 관할로 합니다.\n\n## 부칙\n본 약관은 2026년 4월 1일부터 시행합니다.'
  )
ON CONFLICT (kind) DO NOTHING;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.legal_documents_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_documents_set_updated_at_trg ON public.legal_documents;
CREATE TRIGGER legal_documents_set_updated_at_trg
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.legal_documents_set_updated_at();
