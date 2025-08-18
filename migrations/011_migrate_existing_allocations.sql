-- 기존 발급된 선슬롯 마이그레이션 스크립트
-- 2025-08-18
-- 이미 발급된 선슬롯들을 slot_allocation_history 테이블에 추가

-- 주의: 실행 전에 관리자 ID를 확인하고 변경해야 합니다!

-- 1. 관리자 목록 확인 (먼저 실행해서 관리자 ID 확인)
SELECT id, email, full_name, role 
FROM users 
WHERE role IN ('operator', 'developer')
ORDER BY created_at
LIMIT 10;

-- 2. 기존 선슬롯 발급 현황 확인
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    COUNT(s.id) as empty_slot_count,
    MIN(s.created_at) as first_slot_date,
    MAX(s.created_at) as last_slot_date,
    AVG(s.pre_allocation_amount) as avg_amount
FROM slots s
JOIN users u ON s.user_id = u.id
WHERE s.is_empty = TRUE
GROUP BY u.id, u.email, u.full_name
ORDER BY COUNT(s.id) DESC;

-- 3. 마이그레이션 실행 (관리자 ID를 실제 ID로 변경 필요!)
-- 아래 'YOUR_ADMIN_ID_HERE'를 실제 관리자 UUID로 변경하세요

/*
-- 실제 마이그레이션 쿼리 (주석 해제 후 실행)
INSERT INTO slot_allocation_history (
    operator_id,
    operator_name,
    user_id,
    user_name,
    user_email,
    slot_count,
    price_per_slot,
    reason,
    memo,
    created_at
)
SELECT 
    'YOUR_ADMIN_ID_HERE'::UUID as operator_id,  -- ⚠️ 실제 관리자 ID로 변경!
    '시스템 관리자' as operator_name,
    u.id as user_id,
    u.full_name as user_name,
    u.email as user_email,
    COUNT(s.id) as slot_count,
    COALESCE(AVG(s.pre_allocation_amount), 0) as price_per_slot,
    '초기 데이터 마이그레이션' as reason,
    '기존 발급된 선슬롯 마이그레이션' as memo,
    MIN(s.created_at) as created_at
FROM slots s
JOIN users u ON s.user_id = u.id
WHERE s.is_empty = TRUE
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(s.id) > 0;
*/

-- 4. 마이그레이션 결과 확인
SELECT 
    h.*,
    u.email as current_email,
    ua.allocated_slots,
    ua.used_slots
FROM slot_allocation_history h
JOIN users u ON h.user_id = u.id
LEFT JOIN user_slot_allocations ua ON h.user_id = ua.user_id
WHERE h.reason = '초기 데이터 마이그레이션'
ORDER BY h.created_at DESC;

-- 5. 통계 확인
SELECT 
    COUNT(DISTINCT user_id) as unique_users,
    SUM(slot_count) as total_slots,
    AVG(price_per_slot) as avg_price,
    SUM(total_amount) as total_amount,
    MIN(created_at) as earliest_allocation,
    MAX(created_at) as latest_allocation
FROM slot_allocation_history
WHERE reason = '초기 데이터 마이그레이션';

-- 6. 월별 발행 통계 보기
SELECT * FROM monthly_allocation_stats;

-- 7. 전체 발행 내역 요약 보기
SELECT * FROM slot_allocation_summary
ORDER BY allocation_date DESC
LIMIT 50;