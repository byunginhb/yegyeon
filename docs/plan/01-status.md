# 기능 구현 현황

> 기준일: 2026-04-29

범례: ✅ 구현됨 | 🔶 부분 구현 | ❌ 미구현

---

## P0 — 1차 출시 필수 기능

### 인증 / 회원가입

| 기능 | 상태 | 파일 |
|------|------|------|
| 이메일 회원가입 / 로그인 | ✅ | `app/auth/` |
| 카카오 OAuth | ✅ | Supabase Auth |
| Google OAuth | ✅ | Supabase Auth |
| 가입 시 포인트 1,000 지급 | ✅ | DB 기본값 + RPC |
| **본인인증 (전화번호 SMS)** | ❌ | 미구현 |
| 본인인증 완료 보너스 지급 | ❌ | 미구현 |
| 미인증자 거래 제한 | ❌ | 미구현 (현재 제한 없음) |

### 마켓 시스템

| 기능 | 상태 | 파일 |
|------|------|------|
| Binary Yes/No 마켓 생성 | ✅ | `app/market/create/`, `api/markets/create` |
| Multiple Choice 마켓 생성 | ✅ | 위 동일 (선택지 최대 8개) |
| Numeric 마켓 생성 | ✅ | 위 동일 (범위 설정) |
| 마켓 관리자 승인 시스템 | ✅ | `app/admin/markets/` |
| 승인 대기 배너 (마켓 상세) | ✅ | `components/market/PendingBanner` |
| 거절 사유 표시 | ✅ | `components/market/RejectedBanner` |
| 마켓 목록 조회 (필터/정렬) | ✅ | `app/browse/`, `api/markets` |
| 마켓 상세 페이지 | ✅ | `app/market/[id]/` |
| 마켓 자동 마감 (Cron) | ✅ | `api/cron/close-expired-markets` |
| 카테고리 시스템 | ✅ | `admin/categories/`, `api/categories` |

### 베팅 / 거래

| 기능 | 상태 | 파일 |
|------|------|------|
| Binary YES/NO 베팅 (매수) | ✅ | `api/bets`, `supabase/functions/place_bet` |
| Multiple Choice 베팅 | ✅ | 위 동일 |
| Numeric 베팅 | ✅ | 위 동일 |
| LMSR 확률 계산 | ✅ | `lib/market-math.ts` |
| 포인트 자동 차감 | ✅ | RPC 내 트랜잭션 |
| 매도 기능 | ❌ | P3 범위 (1차 제외) |
| 지정가 주문 | ❌ | P3 범위 (1차 제외) |

### 정산 (Resolution)

| 기능 | 상태 | 파일 |
|------|------|------|
| YES / NO 정산 | ✅ | `api/admin/markets/[id]/resolve` |
| VOID (N/A) 정산 | ✅ | 위 동일 |
| Multiple Choice 정산 | ✅ | RPC `resolve_market` |
| Numeric 정산 | ✅ | 위 동일 |
| 배당금 분배 | ✅ | RPC 내 처리 |
| PARTIAL 정산 | ❌ | P2 범위 (1차 제외) |

### 포인트 / 지갑

| 기능 | 상태 | 파일 |
|------|------|------|
| 포인트 잔액 표시 | ✅ | Header, 프로필 |
| 포인트 거래 내역 | ✅ | `point_transactions` 테이블 |
| 포인트 수동 조정 (관리자) | ✅ | `api/admin/points` |
| **출석 보상 (일일 로그인)** | ✅ | `api/attendance`, `components/gamification/AttendanceWidget` |

### 댓글 / 신고

| 기능 | 상태 | 파일 |
|------|------|------|
| 댓글 작성 / 조회 | ✅ | `api/comments`, `components/market/CommentSection` |
| 댓글 삭제 (soft delete) | ✅ | `is_deleted` 플래그 |
| 마켓 신고 | ✅ | `api/reports`, `components/market/ReportButton` |
| 댓글 신고 | ✅ | 위 동일 |
| 사용자 신고 | ✅ | 위 동일 |
| 신고 관리 (관리자) | ✅ | `app/admin/reports/` |

### 관리자 기능

| 기능 | 상태 | 파일 |
|------|------|------|
| 대시보드 (통계, 승인 대기) | ✅ | `app/admin/page.tsx` |
| 마켓 관리 (승인/거절/종료) | ✅ | `app/admin/markets/` |
| 마켓 상세 팝업 | ✅ | `components/admin/MarketDetailDialog` |
| 사용자 관리 (역할/정지) | ✅ | `app/admin/users/` |
| 포인트 관리 | ✅ | `app/admin/points/` |
| 공지사항 관리 | ✅ | `app/admin/announcements/` |
| 카테고리 관리 | ✅ | `app/admin/categories/` |
| 관리자 로그 | ✅ | `app/admin/logs/` |
| 시스템 설정 | ✅ | `app/admin/settings/` |

### 마이페이지

| 기능 | 상태 | 파일 |
|------|------|------|
| 프로필 조회 | ✅ | `app/profile/[username]/` |
| 베팅 내역 (진행 중 / 완료) | ✅ | 프로필 탭 |
| 수익 통계 | ✅ | 프로필 통계 섹션 |
| 프로필 수정 | ✅ | `app/settings/` |
| 아바타 업로드 | ✅ | `api/settings/avatar` |
| 팔로우 / 언팔로우 | ✅ | `components/market/FollowButton` |
| 팔로우 목록 UI | ❌ | DB/API는 있음, 페이지 없음 |

### 게이미피케이션

| 기능 | 상태 | 파일 |
|------|------|------|
| 출석 보상 (일일 체크인 + streak) | ✅ | `api/attendance`, `components/gamification/AttendanceWidget` |
| 일일 퀘스트 (4종) | ✅ | `api/quests`, `lib/quest.ts`, `components/gamification/QuestPanel` |
| 마켓 공유 (URL복사/X/카카오) | ✅ | `components/market/ShareButton` |

### 기타 인프라

| 기능 | 상태 | 파일 |
|------|------|------|
| RLS 정책 | ✅ | Supabase 마이그레이션 |
| 인증 미들웨어 | ✅ | `middleware.ts` |
| Zod 입력 검증 | ✅ | 모든 API |
| 다크 모드 | ✅ | Tailwind 테마 |
| 모바일 반응형 | ✅ | |
| Vercel 배포 | ✅ | `vercel.json` |
| 마켓 자동 마감 Cron (1일 1회) | ✅ | `api/cron/close-expired-markets` |

---

## P1 — 1차 오픈 직후 기능 (잔여)

| 기능 | 상태 |
|------|------|
| 알림 시스템 | ❌ |
| 실시간 확률 업데이트 (WebSocket) | ❌ |
| 팔로우 목록 페이지 | ❌ |
| 관련 마켓 추천 (RelatedQuestions 컴포넌트는 있음) | 🔶 |
| 고급 검색 (전문 검색) | ❌ |

---

## P2 — 서비스 안정화 후 고도화

| 기능 | 상태 |
|------|------|
| 광고 리워드 | ❌ |
| 일반 Verified 유저 마켓 생성 | ❌ |
| 기본 랭킹 고도화 | 🔶 (기본 구현됨) |
| 태그 필터링 / 자동완성 | 🔶 (저장만 됨) |
| 마켓 북마크 | ❌ |
| PARTIAL 정산 | ❌ |

---

## P3 — 장기 고도화

| 기능 | 상태 |
|------|------|
| 퀘스트 시스템 | ❌ |
| 시즌 리그 | ❌ |
| 상점 / 코스메틱 | ❌ |
| 프리미엄 구독 | ❌ |
| 매도 기능 | ❌ |
| 지정가 주문 | ❌ |
| 공개 API | ❌ |
| 데이터 상품 | ❌ |
| 대출 / 레버리지 | ❌ |
