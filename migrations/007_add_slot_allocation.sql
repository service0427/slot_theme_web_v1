-- 선슬롯발행 시스템을 위한 DB 스키마 변경
-- 2025-08-11

-- 1. 사용자별 슬롯 할당 테이블 생성
CREATE TABLE IF NOT EXISTS user_slot_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allocated_slots INT NOT NULL DEFAULT 0, -- 할당된 총 슬롯 수
    used_slots INT NOT NULL DEFAULT 0,      -- 사용한 슬롯 수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 2. slots 테이블에 필드 추가
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS is_empty BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES user_slot_allocations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slot_number INT; -- 슬롯 번호 (사용자별로 1,2,3...)

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_slots_is_empty ON slots(is_empty);
CREATE INDEX IF NOT EXISTS idx_slots_allocation_id ON slots(allocation_id);
CREATE INDEX IF NOT EXISTS idx_user_slot_allocations_user_id ON user_slot_allocations(user_id);

-- 4. 시스템 설정에 슬롯 운영 방식 추가 (system_settings 테이블 사용)
INSERT INTO system_settings (key, value, category, description)
VALUES 
    ('slotOperationMode', '"normal"', 'business', '슬롯 운영 방식: normal(일반), pre-allocation(선슬롯발행)'),
    ('defaultSlotAllocation', '10', 'business', '기본 할당 슬롯 수')
ON CONFLICT (key) DO NOTHING;

-- 5. 트리거 함수: 할당 정보 업데이트
CREATE OR REPLACE FUNCTION update_allocation_used_slots()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 빈 슬롯이 채워질 때
        IF NEW.is_empty = FALSE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = used_slots + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 빈 슬롯이 채워질 때
        IF OLD.is_empty = TRUE AND NEW.is_empty = FALSE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = used_slots + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        -- 슬롯이 비워질 때 (삭제 등)
        ELSIF OLD.is_empty = FALSE AND NEW.is_empty = TRUE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = GREATEST(0, used_slots - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS update_allocation_trigger ON slots;
CREATE TRIGGER update_allocation_trigger
    AFTER INSERT OR UPDATE OF is_empty ON slots
    FOR EACH ROW
    EXECUTE FUNCTION update_allocation_used_slots();

-- 7. 권한 설정
ALTER TABLE user_slot_allocations OWNER TO simple;
GRANT ALL ON user_slot_allocations TO simple;