-- slot_field_values 테이블 생성 (동적 필드 값 저장)
CREATE TABLE IF NOT EXISTS slot_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL REFERENCES field_configs(field_key) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, field_key)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_slot_field_values_slot_id ON slot_field_values(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_field_values_field_key ON slot_field_values(field_key);

-- 권한 부여
GRANT ALL ON slot_field_values TO simple;