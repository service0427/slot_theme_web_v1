-- 연장 타입을 구분하기 위한 컬럼 추가
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS extension_type VARCHAR(20) DEFAULT NULL;

-- 연장 타입: 'individual' (개별연장), 'bulk' (단체연장)
COMMENT ON COLUMN slots.extension_type IS '연장 타입: individual(개별연장), bulk(단체연장)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_slots_extension_type ON slots(extension_type);

-- 권한 부여
GRANT ALL ON slots TO simple;