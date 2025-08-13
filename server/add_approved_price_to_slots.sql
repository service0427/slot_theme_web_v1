-- slots 테이블에 approved_price 컬럼 추가
ALTER TABLE slots ADD COLUMN IF NOT EXISTS approved_price DECIMAL(10, 2);

-- 기존 active 상태의 슬롯에 기본 가격 설정 (옵션)
-- UPDATE slots SET approved_price = 10000 WHERE status = 'active' AND approved_price IS NULL;