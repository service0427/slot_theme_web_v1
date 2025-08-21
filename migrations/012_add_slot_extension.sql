-- 슬롯 연장 기능을 위한 스키마 변경
-- 2024-01-12

-- slots 테이블에 연장 관련 필드 추가
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES slots(id),
ADD COLUMN IF NOT EXISTS extension_days INTEGER,
ADD COLUMN IF NOT EXISTS extended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extended_by UUID REFERENCES users(id);

-- 인덱스 추가 (연장 슬롯 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_slots_parent_slot_id ON slots(parent_slot_id);

-- slot_allocation_history 테이블에 결제 상태 추가 (이미 있을 수 있음)
ALTER TABLE slot_allocation_history 
ADD COLUMN IF NOT EXISTS payment BOOLEAN DEFAULT false;

-- 슬롯 체인 조회를 위한 뷰 생성 (선택적)
CREATE OR REPLACE VIEW slot_chains AS
WITH RECURSIVE slot_chain AS (
  -- 모든 원본 슬롯 (parent_slot_id가 null인 슬롯)
  SELECT 
    id as root_id,
    id,
    parent_slot_id,
    0 as chain_level,
    ARRAY[id] as chain_path
  FROM slots 
  WHERE parent_slot_id IS NULL
  
  UNION ALL
  
  -- 연장된 슬롯들 재귀적으로 조회
  SELECT 
    sc.root_id,
    s.id,
    s.parent_slot_id,
    sc.chain_level + 1,
    sc.chain_path || s.id
  FROM slots s
  JOIN slot_chain sc ON s.parent_slot_id = sc.id
)
SELECT * FROM slot_chain;

-- 코멘트 추가
COMMENT ON COLUMN slots.parent_slot_id IS '원본 슬롯 ID (연장된 슬롯인 경우)';
COMMENT ON COLUMN slots.extension_days IS '연장 기간 (일)';
COMMENT ON COLUMN slots.extended_at IS '연장 생성 시점';
COMMENT ON COLUMN slots.extended_by IS '연장 처리한 관리자 ID';