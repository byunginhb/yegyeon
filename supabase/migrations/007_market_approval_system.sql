-- 마켓 승인 시스템 1/2: ENUM 값 추가만
-- PostgreSQL ENUM ADD VALUE는 같은 트랜잭션 내에서 즉시 사용 불가 → 별도 커밋 필요

ALTER TYPE market_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE market_status ADD VALUE IF NOT EXISTS 'rejected';
