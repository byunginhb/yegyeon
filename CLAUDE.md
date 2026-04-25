# 예견 (YEGYEON) — 프로젝트 컨텍스트

## 서비스 개요
한국판 예측 시장 플랫폼. Manifold Markets(manifold.markets) 디자인/컨셉을 한국에 맞게 현지화한 클론.
내부 포인트(₣) 시스템 사용, 실제 화폐 거래 없음.

## 하네스: 예견 개발팀

**목표:** 예견 서비스의 설계-구현-검증 전 단계를 에이전트 팀이 분담하여 효율적으로 개발한다.

**트리거:** 예견 기능 구현, 마켓 로직, DB 스키마, UI 컴포넌트, 관리자 페이지 관련 작업 요청 시 `.claude/skills/yegyeon-orchestrator/SKILL.md` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-21 | 초기 하네스 구성 | 전체 | 예견 프로젝트 시작 |
| 2026-04-21 | 관리자 페이지 계획 추가 | docs/Plans.md | 관리자 기능 요구사항 추가 |

## 작업 규칙 (필수 준수)

### 개발 서버 운영 정책
- **기본 원칙**: 개발 서버(`npm run dev`, `next dev` 등)를 임의로 띄우지 않는다. 서버 실행은 사용자가 직접 한다.
- **예외 (확인이 반드시 필요한 경우)**:
  1. UI/런타임 동작 검증이 꼭 필요할 때만 서버를 띄운다.
  2. 띄운 서버는 작업 종료 전 반드시 `kill` 한다 (백그라운드 PID 추적, `lsof -ti:<port>` 등으로 잔존 프로세스 확인).
  3. 사용자 기본 포트(예: 3000)와 충돌하지 않도록 가급적 다른 포트를 사용한다 (`PORT=3100 npm run dev` 등).
- **이유**: 사용자가 직접 서버를 띄울 때 포트 충돌이 발생하는 사례가 있었음.

## 핵심 기술 결정
- Next.js 14 App Router + TypeScript
- Tailwind CSS (Manifold 디자인 토큰 재현) + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS)
- 카카오 OAuth 연동
- Vercel 배포

## 중요 파일 위치
- 마스터 플랜: `docs/Plans.md`
- DB 스키마: `docs/Plans.md` 4번 섹션 + `.claude/skills/supabase-schema/references/schema.sql`
- 마켓 수학: `.claude/skills/market-engine/references/market-math.md`
- 디자인 토큰: `.claude/skills/design-system/references/tailwind-tokens.md`
