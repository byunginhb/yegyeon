# 예견 (YEGYEON) — 프로젝트 마스터 플랜

> 한국판 예측 시장 플랫폼. Manifold Markets 디자인/컨셉을 그대로 클론하되 한국 콘텐츠로 현지화.

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 예견 (YEGYEON) |
| **컨셉** | 누구나 미래 사건에 질문을 만들고, 포인트로 예측에 예측하는 한국 예측 시장 |
| **화폐** | 내부 포인트 (₣ 기호 사용, 가입 시 1,000₣ 지급) |
| **레퍼런스** | Manifold Markets (https://manifold.markets) |
| **대상** | 한국어 사용자, 한국 이슈에 관심 있는 모든 연령 |

---

## 2. 핵심 기능 목록

### 2-1. 사용자 기능

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| 회원가입/로그인 | 이메일 + 카카오 OAuth | P0 |
| 가입 포인트 지급 | 가입 즉시 1,000₣ 자동 지급 | P0 |
| 마켓 브라우징 | 카테고리/정렬/검색으로 마켓 탐색 | P0 |
| 마켓 상세 조회 | 확률 그래프, 예측 내역, 댓글 | P0 |
| 마켓 생성 | Binary / Multiple Choice / Numeric 3종 | P0 |
| 예측 | YES/NO 또는 옵션 선택 후 포인트 투입 | P0 |
| 마켓 정산 | 생성자가 결과 확정 → 포인트 분배 | P0 |
| 포트폴리오 | 내 예측 현황, 손익, 포인트 잔액 | P1 |
| 프로필 페이지 | 예측 히스토리, 예측 적중률, 획득 포인트 | P1 |
| 댓글 | 마켓별 댓글 작성/조회 | P1 |
| 팔로우 | 유저 팔로우/언팔로우 | P2 |
| 리더보드 | 포인트 랭킹 (전체/주간/월간) | P2 |
| 검색 | 마켓/유저/태그 통합 검색 | P1 |
| 다크/라이트 모드 | 테마 전환 | P0 |

### 2-2. 관리자 기능

| 기능 | 설명 | 우선순위 |
|------|------|---------|
| 대시보드 | DAU, 마켓 수, 예측량, 포인트 유통량 통계 | P0 |
| 사용자 관리 | 목록/검색, 정지/복구, 포인트 수동 조정 | P0 |
| 마켓 관리 | 목록/검색, 강제 정산, 숨김/삭제 | P0 |
| 카테고리 관리 | 카테고리 추가/수정/삭제 | P0 |
| 신고 관리 | 신고된 마켓/댓글 검토 및 조치 | P1 |
| 포인트 내역 | 전체 포인트 트랜잭션 조회 | P1 |
| 공지사항 | 배너/팝업 공지 등록 및 관리 | P1 |
| 관리 로그 | 관리자 액션 이력 자동 기록 | P1 |
| 서비스 설정 | 가입 포인트량, 마켓 수수료 등 글로벌 설정 | P2 |

---

## 3. 기술 스택

| 레이어 | 선택 | 버전/비고 |
|--------|------|---------|
| 프레임워크 | Next.js (App Router) | 14.x |
| 언어 | TypeScript | 5.x |
| 스타일 | Tailwind CSS | 3.x |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) | latest |
| 폰트 | Figtree + Noto Sans KR | Google Fonts |
| 데이터베이스 | Supabase (PostgreSQL) | latest |
| 인증 | Supabase Auth | 이메일 + 카카오 OAuth |
| 서버 상태 | TanStack Query (React Query) | v5 |
| 클라이언트 상태 | Zustand | v4 |
| 폼 | React Hook Form + Zod | latest |
| 차트 | Recharts | v2 |
| 테마 | next-themes | latest |
| 배포 | Vercel | latest |
| 아이콘 | Lucide React | latest |

---

## 4. 데이터베이스 스키마 (완전판)

```sql
-- ============================================================
-- ENUM 타입
-- ============================================================
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE market_type AS ENUM ('binary', 'multiple_choice', 'numeric');
CREATE TYPE market_status AS ENUM ('open', 'closed', 'resolved', 'cancelled');
CREATE TYPE bet_outcome AS ENUM ('yes', 'no', 'option', 'numeric');
CREATE TYPE point_tx_type AS ENUM ('signup_bonus', 'bet_placed', 'bet_won', 'bet_refund', 'admin_adjust', 'market_created');
CREATE TYPE report_type AS ENUM ('market', 'comment', 'user');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- ============================================================
-- 사용자
-- ============================================================
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid UNIQUE NOT NULL,          -- Supabase Auth UID
  username      text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  email         text UNIQUE NOT NULL,
  avatar_url    text,
  bio           text,
  points        integer NOT NULL DEFAULT 1000 CHECK (points >= 0),
  role          user_role NOT NULL DEFAULT 'user',
  is_banned     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 카테고리
-- ============================================================
CREATE TABLE categories (
  id         serial PRIMARY KEY,
  name       text NOT NULL,           -- '정치', 'IT/AI', ...
  slug       text UNIQUE NOT NULL,    -- 'politics', 'tech', ...
  icon       text NOT NULL,           -- emoji 또는 lucide 아이콘명
  color      text NOT NULL,           -- hex 색상
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 기본 카테고리 데이터
INSERT INTO categories (name, slug, icon, color, sort_order) VALUES
  ('정치/사회', 'politics', '🏛️', '#6366f1', 1),
  ('IT/AI', 'tech', '💻', '#06b6d4', 2),
  ('스포츠', 'sports', '⚽', '#10b981', 3),
  ('연예/K-문화', 'culture', '🎤', '#f59e0b', 4),
  ('경제/금융', 'economy', '📈', '#3b82f6', 5),
  ('국제', 'world', '🌍', '#8b5cf6', 6),
  ('기타/재미', 'fun', '🎲', '#ec4899', 7);

-- ============================================================
-- 마켓
-- ============================================================
CREATE TABLE markets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  type            market_type NOT NULL,
  status          market_status NOT NULL DEFAULT 'open',
  creator_id      uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  category_id     integer REFERENCES categories(id),

  -- 마감/정산
  close_date      timestamptz NOT NULL,
  resolved_at     timestamptz,
  resolution      text,               -- 'yes'|'no'|option_id|숫자값

  -- 집계 (성능용 denormalized)
  total_volume    integer NOT NULL DEFAULT 0,
  unique_traders  integer NOT NULL DEFAULT 0,
  comment_count   integer NOT NULL DEFAULT 0,

  -- Binary 전용
  yes_probability float NOT NULL DEFAULT 0.5 CHECK (yes_probability BETWEEN 0 AND 1),

  -- Numeric 전용
  min_value       float,
  max_value       float,
  unit            text,               -- '명', '%', '원' 등 단위

  -- 메타
  is_hidden       boolean NOT NULL DEFAULT false,
  tags            text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 마켓 옵션 (Multiple Choice 전용)
-- ============================================================
CREATE TABLE market_options (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id    uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  text         text NOT NULL,
  color        text NOT NULL DEFAULT '#6366f1',
  probability  float NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 1),
  total_amount integer NOT NULL DEFAULT 0,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 예측
-- ============================================================
CREATE TABLE bets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id   uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  option_id   uuid REFERENCES market_options(id),   -- multiple_choice 전용

  outcome     text NOT NULL,    -- 'yes'|'no'|option_id|숫자값(string)
  amount      integer NOT NULL CHECK (amount > 0),   -- 소비 포인트
  shares      float NOT NULL,                         -- 획득 지분
  payout      integer,                                -- 정산 후 수령 포인트 (null = 미정산)

  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 포인트 트랜잭션 (감사 추적)
-- ============================================================
CREATE TABLE point_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        point_tx_type NOT NULL,
  amount      integer NOT NULL,         -- 양수=획득, 음수=소비
  balance     integer NOT NULL,         -- 트랜잭션 후 잔액
  ref_id      uuid,                     -- 관련 bet/market id
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 댓글
-- ============================================================
CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id   uuid NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 팔로우
-- ============================================================
CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================
-- 신고
-- ============================================================
CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        report_type NOT NULL,
  target_id   uuid NOT NULL,         -- market_id | comment_id | user_id
  reason      text NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  note        text,                  -- 관리자 메모
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 공지사항
-- ============================================================
CREATE TABLE announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL,
  type        text NOT NULL DEFAULT 'banner',  -- 'banner'|'popup'
  is_active   boolean NOT NULL DEFAULT true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 관리 로그
-- ============================================================
CREATE TABLE admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES users(id),
  action      text NOT NULL,          -- 'ban_user', 'resolve_market', ...
  target_type text NOT NULL,          -- 'user', 'market', 'comment', ...
  target_id   uuid NOT NULL,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 서비스 설정
-- ============================================================
CREATE TABLE service_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_by  uuid REFERENCES users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO service_settings (key, value, description) VALUES
  ('signup_bonus', '1000', '신규 가입 지급 포인트'),
  ('market_creation_cost', '0', '마켓 생성 비용 포인트'),
  ('min_bet_amount', '10', '최소 예측 포인트');
```

---

## 5. 페이지 구조

### 5-1. 사용자 페이지

```
app/
├── (public)/                         # 비로그인 접근 가능
│   ├── page.tsx                      # / 홈 피드
│   ├── browse/page.tsx               # /browse 전체 마켓
│   ├── market/[id]/page.tsx          # /market/[id] 마켓 상세
│   ├── profile/[username]/page.tsx   # /profile/[username]
│   ├── leaderboard/page.tsx          # /leaderboard 랭킹
│   └── about/page.tsx                # /about 서비스 소개
│
├── (auth)/                           # 로그인 필요
│   ├── portfolio/page.tsx            # /portfolio 내 예측
│   ├── market/create/page.tsx        # /market/create 마켓 생성
│   └── settings/page.tsx            # /settings 계정 설정
│
└── auth/
    ├── login/page.tsx                # /auth/login
    ├── signup/page.tsx               # /auth/signup
    └── callback/route.ts             # OAuth 콜백
```

### 5-2. 관리자 페이지

```
app/
└── admin/                            # role=admin 전용 (미들웨어 보호)
    ├── layout.tsx                    # 관리자 레이아웃
    ├── page.tsx                      # /admin 대시보드
    ├── users/
    │   ├── page.tsx                  # /admin/users 사용자 목록
    │   └── [id]/page.tsx             # /admin/users/[id] 상세
    ├── markets/
    │   ├── page.tsx                  # /admin/markets 마켓 목록
    │   └── [id]/page.tsx             # /admin/markets/[id] 상세
    ├── categories/page.tsx           # /admin/categories
    ├── reports/page.tsx              # /admin/reports 신고 목록
    ├── points/page.tsx               # /admin/points 포인트 내역
    ├── announcements/page.tsx        # /admin/announcements
    ├── logs/page.tsx                 # /admin/logs 관리 이력
    └── settings/page.tsx             # /admin/settings 서비스 설정
```

---

## 6. 컴포넌트 트리

```
components/
├── layout/
│   ├── Header.tsx              # 로고, 네비, 포인트 표시, 다크모드 토글
│   ├── Sidebar.tsx             # 트렌딩 마켓, 추천 유저 (데스크탑)
│   ├── MobileNav.tsx           # 하단 고정 탭 (모바일)
│   └── Footer.tsx
│
├── markets/
│   ├── MarketCard.tsx          # 마켓 카드 (핵심)
│   ├── MarketGrid.tsx          # 카드 그리드/목록
│   ├── CategoryTabs.tsx        # 카테고리 필터 탭
│   ├── SortTabs.tsx            # Best/Hot/New 정렬
│   ├── MarketSearch.tsx        # 검색 인풋
│   ├── BettingPanel.tsx        # 예측 패널 (Binary)
│   ├── BettingPanelMultiple.tsx # 예측 패널 (Multiple Choice)
│   ├── BettingPanelNumeric.tsx  # 예측 패널 (Numeric)
│   ├── ProbabilityBar.tsx      # 확률 게이지
│   ├── MarketTypeTag.tsx       # 마켓 타입 뱃지
│   └── MarketStatusBadge.tsx   # 상태 뱃지
│
├── charts/
│   ├── ProbabilityChart.tsx    # 확률 변화 선 그래프
│   └── VolumeChart.tsx         # 거래량 바 차트
│
├── profile/
│   ├── UserAvatar.tsx
│   ├── PointsBadge.tsx
│   └── CalibrationScore.tsx    # 예측 적중률
│
├── admin/
│   ├── AdminSidebar.tsx
│   ├── StatsCard.tsx           # 통계 카드
│   ├── DataTable.tsx           # 공통 테이블
│   └── AdminActionMenu.tsx     # 액션 드롭다운
│
└── ui/                         # shadcn/ui 컴포넌트
    └── (Button, Input, Dialog, Select, ...)
```

---

## 7. API 라우트

### Next.js API Routes (`app/api/`)

```
api/
├── auth/
│   └── callback/route.ts           # Supabase OAuth 콜백
│
├── markets/
│   ├── route.ts                    # GET(목록) POST(생성)
│   ├── [id]/route.ts               # GET(상세) PATCH(수정) DELETE
│   ├── [id]/bet/route.ts           # POST(예측)
│   ├── [id]/resolve/route.ts       # POST(정산)
│   └── [id]/comments/route.ts     # GET POST
│
├── users/
│   ├── [username]/route.ts         # GET(프로필)
│   └── [username]/follow/route.ts  # POST DELETE
│
├── portfolio/route.ts              # GET(내 예측 현황)
│
└── admin/
    ├── stats/route.ts              # GET(대시보드 통계)
    ├── users/route.ts              # GET POST
    ├── users/[id]/route.ts         # GET PATCH(정지/포인트조정)
    ├── markets/route.ts            # GET
    ├── markets/[id]/route.ts       # GET PATCH(숨김/강제정산)
    ├── reports/route.ts            # GET
    ├── reports/[id]/route.ts       # PATCH(처리)
    └── announcements/route.ts     # GET POST PATCH DELETE
```

---

## 8. 마켓 메커니즘 상세

### 8-1. Binary (Yes/No)

```typescript
// 확률 계산 (LMSR 단순화)
const YES_LIQUIDITY = 100  // 초기 유동성

function calcProbability(yesPool: number, noPool: number): number {
  return yesPool / (yesPool + noPool)
}

function calcShares(amount: number, probability: number, outcome: 'yes' | 'no'): number {
  const p = outcome === 'yes' ? probability : 1 - probability
  return amount / p  // 지분 = 투자금 / 현재 확률
}

// 정산: 승리 측 보유 지분 × (전체 풀 / 승리 측 총 지분) = 개인 수령
function calcPayout(shares: number, winnerShares: number, totalPool: number): number {
  return Math.floor((shares / winnerShares) * totalPool)
}
```

### 8-2. Multiple Choice

```typescript
// 각 옵션의 확률 = 해당 옵션 투자량 / 전체 투자량
function calcOptionProbability(optionAmount: number, totalAmount: number): number {
  if (totalAmount === 0) return 1 / optionCount
  return optionAmount / totalAmount
}

// 정산: 당첨 옵션 보유자에게 전체 풀 균등 분배 (지분 비례)
```

### 8-3. Numeric

```typescript
// 사용자가 숫자 예측값 입력
// 정산: 실제값 ± 10% 이내 예측자 전원 균등 분배
// 정확도에 따라 가중치 부여 (선택적)
function isWinner(predicted: number, actual: number, tolerance = 0.1): boolean {
  return Math.abs(predicted - actual) / actual <= tolerance
}
```

---

## 9. 반응형 브레이크포인트

| 구간 | 너비 | 레이아웃 |
|------|------|---------|
| 모바일 | < 768px | 1열 카드, 하단 탭 네비, 사이드바 → 드로어 |
| 태블릿 | 768px ~ 1024px | 2열 카드, 상단 네비, 사이드바 숨김 |
| 데스크탑 | > 1024px | 좌측 사이드 네비 + 중앙 피드(2~3열) + 우측 사이드바 |

---

## 10. 개발 단계 (Phases)

### Phase 1 — 프로젝트 기반 설정
- [ ] Next.js 14 프로젝트 생성 (TypeScript, App Router)
- [ ] Tailwind CSS 설정 + Manifold 디자인 토큰 적용
- [ ] shadcn/ui 설치 및 컴포넌트 초기화
- [ ] Figtree + Noto Sans KR 폰트 설정
- [ ] next-themes 다크/라이트 모드 설정
- [ ] Supabase 프로젝트 생성 + 클라이언트 연결
- [ ] 레이아웃 컴포넌트 (Header, Sidebar, MobileNav, Footer)
- [ ] 반응형 기본 레이아웃 구성

### Phase 2 — 인증
- [ ] Supabase Auth 설정 (이메일 인증)
- [ ] 카카오 OAuth 연동
- [ ] 로그인/회원가입 페이지 UI
- [ ] 가입 시 users 테이블 자동 생성 + 1,000₣ 지급 (DB 트리거)
- [ ] 인증 미들웨어 (보호된 라우트)
- [ ] 관리자 라우트 보호 미들웨어

### Phase 3 — 마켓 브라우징
- [ ] DB 스키마 마이그레이션 (전체)
- [ ] MarketCard 컴포넌트
- [ ] CategoryTabs, SortTabs, MarketSearch 컴포넌트
- [ ] 홈 피드 페이지 (`/`)
- [ ] 브라우징 페이지 (`/browse`)
- [ ] 마켓 상세 페이지 (`/market/[id]`)
- [ ] ProbabilityBar, MarketTypeTag 컴포넌트
- [ ] 더미 데이터 시드

### Phase 4 — 마켓 생성
- [ ] 마켓 생성 폼 (타입 선택 → 세부 입력)
- [ ] Binary 마켓 생성 API
- [ ] Multiple Choice 마켓 생성 API
- [ ] Numeric 마켓 생성 API
- [ ] 카테고리 선택, 마감일 선택

### Phase 5 — 예측 시스템
- [ ] BettingPanel 컴포넌트 (Binary)
- [ ] BettingPanel (Multiple Choice / Numeric)
- [ ] 예측 API (포인트 차감 + 지분 계산 + 확률 업데이트 원자적 처리)
- [ ] point_transactions 기록
- [ ] ProbabilityChart (Recharts)
- [ ] 마켓 정산 API + UI
- [ ] 포트폴리오 페이지

### Phase 6 — 소셜 기능
- [ ] 댓글 CRUD
- [ ] 팔로우/언팔로우
- [ ] 프로필 페이지
- [ ] 리더보드 페이지

### Phase 7 — 관리자 페이지
- [ ] 관리자 레이아웃 (AdminSidebar)
- [ ] 대시보드 (통계 카드 + 차트)
- [ ] 사용자 관리 (목록 DataTable, 상세, 정지/복구, 포인트 조정)
- [ ] 마켓 관리 (목록, 강제 정산, 숨김)
- [ ] 카테고리 관리 CRUD
- [ ] 신고 관리
- [ ] 포인트 내역 조회
- [ ] 공지사항 관리
- [ ] 관리 로그 조회
- [ ] 서비스 설정

### Phase 8 — 마무리
- [ ] RLS(Row Level Security) 정책 전수 검토
- [ ] SEO (메타 태그, OG 이미지)
- [ ] 에러 페이지 (404, 500)
- [ ] 로딩/스켈레톤 UI
- [ ] Vercel 배포 설정
- [ ] 환경 변수 정리

---

## 11. 디자인 토큰 (Manifold 원본 재현)

```typescript
// tailwind.config.ts
const colors = {
  // 텍스트/아이콘 계층 (다크모드 CSS 변수 스위칭)
  ink: {
    0: 'var(--color-ink-0)',      // 흰색/검정
    100: 'var(--color-ink-100)',
    300: 'var(--color-ink-300)',
    500: 'var(--color-ink-500)',  // 본문
    700: 'var(--color-ink-700)',
    900: 'var(--color-ink-900)',
    1000: 'var(--color-ink-1000)', // 검정/흰색
  },
  // 배경 계층
  canvas: {
    0: 'var(--color-canvas-0)',   // 카드 배경
    50: 'var(--color-canvas-50)',
    100: 'var(--color-canvas-100)', // 페이지 배경
  },
  // 브랜드 (보라/인디고)
  primary: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe',
    300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1',
    600: '#4f46e5', 700: '#4338ca', 800: '#3730a3',
    900: '#312e81', 950: '#1e1b4b',
  },
  // YES 색상 (초록)
  teal: {
    400: 'var(--color-yes-400)',
    500: 'var(--color-yes-500)',
    600: 'var(--color-yes-600)',
  },
  // NO 색상 (빨강)
  scarlet: {
    400: 'var(--color-no-400)',
    500: 'var(--color-no-500)',
    600: 'var(--color-no-600)',
  },
  warning: '#F0D630',
  error: '#E70D3D',
}

// CSS Variables (globals.css)
// :root { --color-canvas-0: #ffffff; --color-ink-1000: #111827; ... }
// .dark { --color-canvas-0: #1f2937; --color-ink-1000: #f9fafb; ... }
```

---

## 12. 환경 변수 목록

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 서버 전용 (관리자 작업)

# Kakao OAuth (Supabase 대시보드에서 설정)
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=예견
```

---

## 13. Supabase RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| users | 모두 | Auth 트리거 | 본인만 | 불가 |
| markets | 모두 (hidden 제외) | 로그인 유저 | 생성자 + admin | admin |
| market_options | 모두 | 로그인 유저 | 생성자 + admin | admin |
| bets | 본인 + admin | 로그인 유저 | 불가 | 불가 |
| point_transactions | 본인 + admin | 서버만 (service role) | 불가 | 불가 |
| comments | 모두 (deleted 제외) | 로그인 유저 | 본인만 | admin |
| follows | 모두 | 로그인 유저 | 불가 | 본인만 |
| reports | admin | 로그인 유저 | admin | 불가 |
| announcements | 모두 (active) | admin | admin | admin |
| admin_logs | admin | 서버만 | 불가 | 불가 |
| service_settings | admin | admin | admin | 불가 |

---

## 14. 폴더 구조 (최종)

```
yegyeon/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── admin/
│   ├── auth/
│   ├── api/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   ├── markets/
│   ├── charts/
│   ├── profile/
│   ├── admin/
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # 브라우저용 클라이언트
│   │   ├── server.ts       # 서버 컴포넌트용
│   │   └── admin.ts        # service role 클라이언트
│   ├── market-math.ts      # 확률 계산 로직
│   ├── validations.ts      # Zod 스키마
│   └── utils.ts
├── hooks/
│   ├── useMarkets.ts
│   ├── useBetting.ts
│   └── useUser.ts
├── types/
│   └── index.ts            # 전체 TypeScript 타입
├── middleware.ts            # 인증 + 관리자 보호
├── tailwind.config.ts
├── .env.local
├── .env.example
└── docs/
    └── Plans.md            # 이 파일
```
