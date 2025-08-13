-- 입력 필드 설정 테이블 생성
CREATE TABLE IF NOT EXISTS field_configs (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'url', 'textarea', 'select', 'date', 'email')),
    is_required BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    show_in_list BOOLEAN DEFAULT true,
    is_searchable BOOLEAN DEFAULT true,
    placeholder TEXT,
    validation_rule TEXT,
    options JSONB, -- select 타입일 때 옵션들
    default_value TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- slots 테이블에 form_data 컬럼 추가
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS form_data JSONB,
ADD COLUMN IF NOT EXISTS issue_type VARCHAR(20) DEFAULT 'normal' CHECK (issue_type IN ('normal', 'pre_issued'));

-- 기본 필드 설정 삽입
INSERT INTO field_configs (field_key, label, field_type, is_required, is_enabled, display_order) VALUES
('keyword', '키워드', 'text', true, true, 1),
('mid', 'MID', 'text', false, true, 2),
('url', 'URL', 'url', false, true, 3)
ON CONFLICT (field_key) DO NOTHING;

-- 기존 데이터 마이그레이션 (keyword, mid, url을 form_data로 이동)
UPDATE slots 
SET form_data = jsonb_build_object(
    'keyword', keyword,
    'mid', mid,
    'url', url
)
WHERE form_data IS NULL;

-- 선슬롯 발행 테이블
CREATE TABLE IF NOT EXISTS pre_issued_slots (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_slots INT NOT NULL,
    used_slots INT DEFAULT 0,
    remaining_slots INT GENERATED ALWAYS AS (total_slots - used_slots) STORED,
    work_days INT NOT NULL, -- 작업일 (7, 10, 30 등)
    issued_by UUID NOT NULL REFERENCES users(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 선슬롯 사용 내역
CREATE TABLE IF NOT EXISTS pre_issued_slot_usage (
    id SERIAL PRIMARY KEY,
    pre_issued_id INT NOT NULL REFERENCES pre_issued_slots(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    form_data JSONB,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

-- 인덱스 추가
CREATE INDEX idx_field_configs_enabled ON field_configs(is_enabled);
CREATE INDEX idx_field_configs_order ON field_configs(display_order);
CREATE INDEX idx_slots_form_data ON slots USING GIN (form_data);
CREATE INDEX idx_slots_issue_type ON slots(issue_type);
CREATE INDEX idx_pre_issued_slots_user ON pre_issued_slots(user_id);
CREATE INDEX idx_pre_issued_slots_status ON pre_issued_slots(status);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_field_configs_updated_at BEFORE UPDATE ON field_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_issued_slots_updated_at BEFORE UPDATE ON pre_issued_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();