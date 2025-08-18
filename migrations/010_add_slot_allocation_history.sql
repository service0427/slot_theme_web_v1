-- 선슬롯 발행 내역 테이블 추가
-- 2025-08-18
-- 언제, 어떤 관리자가, 어떤 사용자에게, 몇 개의 슬롯을, 얼마에 발행했는지 기록

-- 1. 선슬롯 발행 내역 테이블 생성
CREATE TABLE IF NOT EXISTS slot_allocation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 관리자 정보
    operator_id UUID NOT NULL REFERENCES users(id),
    operator_name VARCHAR(255), -- 발행 당시 관리자 이름 (변경될 수 있으므로 스냅샷)
    
    -- 사용자 정보
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(255), -- 발행 당시 사용자 이름 (변경될 수 있으므로 스냅샷)
    user_email VARCHAR(255), -- 발행 당시 사용자 아이디
    
    -- 발행 정보
    slot_count INT NOT NULL, -- 발행한 슬롯 개수
    price_per_slot DECIMAL(10, 2) NOT NULL, -- 슬롯당 금액
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (slot_count * price_per_slot) STORED, -- 총 금액
    
    -- 발행 사유 및 메모
    reason VARCHAR(500), -- 발행 사유
    memo TEXT, -- 추가 메모
    
    -- 시간 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_allocation_history_operator ON slot_allocation_history(operator_id);
CREATE INDEX idx_allocation_history_user ON slot_allocation_history(user_id);
CREATE INDEX idx_allocation_history_created ON slot_allocation_history(created_at DESC);

-- 2. slots 테이블에 pre_allocation_amount 컬럼 추가 (없으면)
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS pre_allocation_amount DECIMAL(10, 2) DEFAULT 0;

-- 3. 기존 발급된 슬롯 마이그레이션을 위한 쿼리
-- 이미 발급된 선슬롯들을 히스토리에 추가 (초기 데이터 마이그레이션)
-- 주의: 이 쿼리는 수동으로 실행해야 함 (operator_id를 지정해야 함)

/*
-- 마이그레이션 예시 (관리자 ID를 실제 ID로 변경 필요)
INSERT INTO slot_allocation_history (
    operator_id,
    operator_name,
    user_id,
    user_name,
    user_email,
    slot_count,
    price_per_slot,
    reason,
    created_at
)
SELECT 
    '관리자UUID'::UUID as operator_id, -- 실제 관리자 ID로 변경 필요
    '시스템 관리자' as operator_name,
    u.id as user_id,
    u.full_name as user_name,
    u.email as user_email,
    COUNT(s.id) as slot_count,
    COALESCE(AVG(s.pre_allocation_amount), 0) as price_per_slot,
    '초기 데이터 마이그레이션' as reason,
    MIN(s.created_at) as created_at
FROM slots s
JOIN users u ON s.user_id = u.id
WHERE s.is_empty = TRUE -- 빈 슬롯(선슬롯)만
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(s.id) > 0;
*/

-- 4. 뷰 생성: 발행 내역 요약
CREATE OR REPLACE VIEW slot_allocation_summary AS
SELECT 
    h.id,
    h.created_at as allocation_date,
    h.operator_name,
    h.user_name,
    h.user_email,
    h.slot_count,
    h.price_per_slot,
    h.total_amount,
    h.reason,
    ua.allocated_slots as current_allocated,
    ua.used_slots as current_used,
    (ua.allocated_slots - ua.used_slots) as remaining_slots
FROM slot_allocation_history h
LEFT JOIN user_slot_allocations ua ON h.user_id = ua.user_id
ORDER BY h.created_at DESC;

-- 5. 통계 뷰: 월별 발행 내역
CREATE OR REPLACE VIEW monthly_allocation_stats AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as allocation_count,
    SUM(slot_count) as total_slots_allocated,
    SUM(total_amount) as total_revenue,
    AVG(price_per_slot) as avg_price_per_slot
FROM slot_allocation_history
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 6. 권한 설정
ALTER TABLE slot_allocation_history OWNER TO simple;
GRANT ALL ON slot_allocation_history TO simple;
GRANT SELECT ON slot_allocation_summary TO simple;
GRANT SELECT ON monthly_allocation_stats TO simple;

-- 7. 코멘트 추가
COMMENT ON TABLE slot_allocation_history IS '선슬롯 발행 내역 테이블';
COMMENT ON COLUMN slot_allocation_history.operator_id IS '발행한 관리자 ID';
COMMENT ON COLUMN slot_allocation_history.user_id IS '발행받은 사용자 ID';
COMMENT ON COLUMN slot_allocation_history.slot_count IS '발행한 슬롯 개수';
COMMENT ON COLUMN slot_allocation_history.price_per_slot IS '슬롯당 금액';
COMMENT ON COLUMN slot_allocation_history.total_amount IS '총 발행 금액 (자동계산)';