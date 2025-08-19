-- 슬롯 발급 내역 마이그레이션 SQL
-- 기존 empty 슬롯들에 allocation_history_id를 연결

-- 1. 마이그레이션 전 데이터 확인
SELECT 
  'Before Migration' as status,
  COUNT(*) as total_empty_slots,
  COUNT(allocation_history_id) as slots_with_history
FROM slots 
WHERE status = 'empty';

-- 2. 실제 마이그레이션 수행
-- user_id와 created_at이 일치하는 경우 매칭
UPDATE slots s
SET allocation_history_id = sah.id
FROM slot_allocation_history sah
WHERE s.user_id = sah.user_id
  AND s.created_at = sah.created_at
  AND s.status = 'empty'
  AND s.allocation_history_id IS NULL
  AND sah.reason NOT LIKE '%마이그레이션%';  -- 마이그레이션 기록 제외

-- 3. 마이그레이션 후 데이터 확인
SELECT 
  'After Migration' as status,
  COUNT(*) as total_empty_slots,
  COUNT(allocation_history_id) as slots_with_history
FROM slots 
WHERE status = 'empty';

-- 4. 마이그레이션 결과 상세 확인
SELECT 
  sah.id as history_id,
  sah.user_id,
  sah.user_name,
  sah.slot_count as allocated,
  COUNT(s.id) as matched_slots,
  sah.created_at as allocation_date
FROM slot_allocation_history sah
LEFT JOIN slots s ON s.allocation_history_id = sah.id
WHERE sah.reason NOT LIKE '%마이그레이션%'
GROUP BY sah.id, sah.user_id, sah.user_name, sah.slot_count, sah.created_at
ORDER BY sah.created_at;