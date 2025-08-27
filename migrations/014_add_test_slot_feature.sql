-- 테스트 슬롯 기능 추가
-- 2025-08-27

-- slots 테이블에 is_test 컬럼 추가
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- 인덱스 추가 (테스트 슬롯 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_slots_is_test ON slots(is_test);

-- 코멘트 추가
COMMENT ON COLUMN slots.is_test IS '테스트 슬롯 여부 (3일 무료 체험)';

-- 권한 부여
GRANT ALL ON slots TO simple;