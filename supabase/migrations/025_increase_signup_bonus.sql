-- 신규 가입 보너스를 1,000 → 100,000 포인트로 상향 (선착순 가입 이벤트)
UPDATE service_settings SET value = '100000' WHERE key = 'signup_bonus';
