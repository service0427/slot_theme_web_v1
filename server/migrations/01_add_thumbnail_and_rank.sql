-- slots 테이블에 썸네일과 순위 필드 추가
-- 외부 프로세스(크롤러, API 등)에서 자동으로 업데이트되는 필드들

ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500),
ADD COLUMN IF NOT EXISTS first_rank INTEGER,
ADD COLUMN IF NOT EXISTS rank INTEGER;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_slots_thumbnail ON slots(thumbnail);
CREATE INDEX IF NOT EXISTS idx_slots_rank ON slots(rank);