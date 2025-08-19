-- allocation_history가 없는 기존 슬롯들을 위한 히스토리 생성

-- 1. 현재 상황 확인
SELECT 
  '마이그레이션 전' as phase,
  status,
  COUNT(*) as total,
  COUNT(allocation_history_id) as with_history
FROM slots
GROUP BY status
ORDER BY status;

-- 2. allocation_history가 없는 슬롯들을 사용자별, 시간별로 그룹핑
WITH slot_groups AS (
  SELECT 
    user_id,
    status,
    DATE_TRUNC('day', created_at) as created_day,
    COUNT(*) as slot_count,
    ARRAY_AGG(id ORDER BY created_at) as slot_ids,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM slots
  WHERE allocation_history_id IS NULL
  GROUP BY user_id, status, DATE_TRUNC('day', created_at)
)
SELECT 
  sg.user_id,
  u.full_name as user_name,
  sg.status,
  sg.created_day,
  sg.slot_count,
  sg.first_created,
  sg.last_created
FROM slot_groups sg
LEFT JOIN users u ON u.id = sg.user_id
ORDER BY sg.created_day, sg.user_id;

-- 3. 기존 슬롯들을 위한 allocation_history 생성 (트랜잭션으로 처리)
BEGIN;

-- 3-1. 각 사용자의 active/paused/refunded 슬롯들을 위한 히스토리 생성
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
  s.user_id as operator_id,  -- 자기 자신이 발급한 것으로 처리
  '시스템' as operator_name,
  s.user_id,
  u.full_name as user_name,
  u.email as user_email,
  COUNT(*) as slot_count,
  0 as price_per_slot,  -- 기존 슬롯은 가격 정보 없음
  '시스템 마이그레이션 - ' || s.status || ' 슬롯' as reason,
  '기존 슬롯 히스토리 자동 생성' as memo,
  MIN(s.created_at) as created_at
FROM slots s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.allocation_history_id IS NULL
  AND s.status IN ('active', 'paused', 'refunded')
GROUP BY s.user_id, s.status, u.full_name, u.email;

-- 3-2. 생성된 히스토리를 슬롯과 연결
WITH new_histories AS (
  SELECT 
    sah.id as history_id,
    sah.user_id,
    sah.reason,
    sah.created_at
  FROM slot_allocation_history sah
  WHERE sah.reason LIKE '시스템 마이그레이션%'
    AND sah.created_at >= NOW() - INTERVAL '1 minute'
),
slots_to_update AS (
  SELECT 
    s.id as slot_id,
    s.user_id,
    s.status,
    s.created_at,
    nh.history_id,
    ROW_NUMBER() OVER (
      PARTITION BY s.user_id, s.status
      ORDER BY s.created_at
    ) as rn
  FROM slots s
  INNER JOIN new_histories nh ON (
    s.user_id = nh.user_id 
    AND nh.reason LIKE '%' || s.status || '%'
  )
  WHERE s.allocation_history_id IS NULL
)
UPDATE slots
SET allocation_history_id = stu.history_id
FROM slots_to_update stu
WHERE slots.id = stu.slot_id;

COMMIT;

-- 4. 마이그레이션 후 확인
SELECT 
  '마이그레이션 후' as phase,
  status,
  COUNT(*) as total,
  COUNT(allocation_history_id) as with_history
FROM slots
GROUP BY status
ORDER BY status;

-- 5. allocation_history 연결 상태 상세 확인
SELECT 
  sah.id,
  sah.user_name,
  sah.reason,
  sah.slot_count as allocated,
  COUNT(s.id) as connected_slots,
  sah.created_at
FROM slot_allocation_history sah
LEFT JOIN slots s ON s.allocation_history_id = sah.id
GROUP BY sah.id, sah.user_name, sah.reason, sah.slot_count, sah.created_at
ORDER BY sah.created_at DESC;