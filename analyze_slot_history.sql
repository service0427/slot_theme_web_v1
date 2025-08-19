-- slots과 slot_allocation_history 데이터 정리를 위한 분석 쿼리

-- 1. 현재 상태 파악
SELECT 
  '전체 슬롯 현황' as description,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN status = 'empty' THEN 1 END) as empty_slots,
  COUNT(allocation_history_id) as slots_with_history,
  COUNT(CASE WHEN status = 'empty' AND allocation_history_id IS NULL THEN 1 END) as empty_without_history
FROM slots;

-- 2. 분 단위로 같은 시간에 생성된 슬롯들 그룹핑
WITH slot_groups AS (
  SELECT 
    user_id,
    DATE_TRUNC('minute', created_at) as created_minute,
    COUNT(*) as slot_count,
    ARRAY_AGG(id ORDER BY created_at) as slot_ids,
    ARRAY_AGG(status) as statuses,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM slots
  WHERE status = 'empty' 
    AND allocation_history_id IS NULL
  GROUP BY user_id, DATE_TRUNC('minute', created_at)
  HAVING COUNT(*) > 1  -- 2개 이상 같은 시간에 생성된 것만
)
SELECT 
  sg.user_id,
  u.full_name as user_name,
  sg.created_minute,
  sg.slot_count,
  sg.first_created,
  sg.last_created,
  EXTRACT(EPOCH FROM (sg.last_created - sg.first_created)) as seconds_diff
FROM slot_groups sg
LEFT JOIN users u ON u.id = sg.user_id
ORDER BY sg.created_minute DESC;

-- 3. slot_allocation_history와 매칭 가능한 슬롯 찾기
WITH time_matched AS (
  SELECT 
    s.id as slot_id,
    s.user_id,
    s.created_at as slot_created,
    sah.id as history_id,
    sah.created_at as history_created,
    sah.slot_count,
    ABS(EXTRACT(EPOCH FROM (s.created_at - sah.created_at))) as time_diff_seconds,
    ROW_NUMBER() OVER (
      PARTITION BY s.id 
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.created_at - sah.created_at)))
    ) as match_rank
  FROM slots s
  CROSS JOIN slot_allocation_history sah
  WHERE s.user_id = sah.user_id
    AND s.status = 'empty'
    AND s.allocation_history_id IS NULL
    AND DATE_TRUNC('minute', s.created_at) = DATE_TRUNC('minute', sah.created_at)
)
SELECT 
  user_id,
  history_id,
  slot_count as allocated_count,
  COUNT(slot_id) as matched_slots,
  MIN(time_diff_seconds) as min_time_diff,
  MAX(time_diff_seconds) as max_time_diff,
  ARRAY_AGG(slot_id ORDER BY slot_created) as slot_ids
FROM time_matched
WHERE match_rank = 1
GROUP BY user_id, history_id, slot_count
ORDER BY MIN(slot_created) DESC;

-- 4. 매칭 가능한 데이터 UPDATE 쿼리 생성
WITH matched_slots AS (
  SELECT 
    s.id as slot_id,
    sah.id as history_id,
    ROW_NUMBER() OVER (
      PARTITION BY sah.id 
      ORDER BY s.created_at
    ) as slot_rank,
    ROW_NUMBER() OVER (
      PARTITION BY s.user_id, DATE_TRUNC('minute', s.created_at)
      ORDER BY s.created_at
    ) as group_rank
  FROM slots s
  INNER JOIN slot_allocation_history sah ON (
    s.user_id = sah.user_id
    AND DATE_TRUNC('minute', s.created_at) = DATE_TRUNC('minute', sah.created_at)
    AND s.status = 'empty'
    AND s.allocation_history_id IS NULL
  )
)
SELECT 
  'UPDATE slots SET allocation_history_id = ''' || history_id || ''' WHERE id = ''' || slot_id || ''';' as update_query
FROM matched_slots
WHERE slot_rank <= (
  SELECT slot_count 
  FROM slot_allocation_history 
  WHERE id = matched_slots.history_id
)
ORDER BY history_id, slot_rank;

-- 5. 매칭되지 않은 슬롯들을 위한 새 allocation_history 생성 제안
WITH unmatched_groups AS (
  SELECT 
    user_id,
    DATE_TRUNC('minute', created_at) as created_minute,
    COUNT(*) as slot_count,
    ARRAY_AGG(id ORDER BY created_at) as slot_ids
  FROM slots
  WHERE status = 'empty' 
    AND allocation_history_id IS NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM slot_allocation_history sah 
      WHERE sah.user_id = slots.user_id 
        AND DATE_TRUNC('minute', sah.created_at) = DATE_TRUNC('minute', slots.created_at)
    )
  GROUP BY user_id, DATE_TRUNC('minute', created_at)
)
SELECT 
  ug.user_id,
  u.full_name as user_name,
  u.email as user_email,
  ug.created_minute,
  ug.slot_count,
  'INSERT INTO slot_allocation_history (operator_id, operator_name, user_id, user_name, user_email, slot_count, price_per_slot, reason, created_at) VALUES (''' || 
  ug.user_id || ''', ''시스템'', ''' || 
  ug.user_id || ''', ''' || 
  u.full_name || ''', ''' || 
  u.email || ''', ' || 
  ug.slot_count || ', 0, ''시스템 마이그레이션'', ''' || 
  ug.created_minute || ''') RETURNING id;' as insert_query
FROM unmatched_groups ug
LEFT JOIN users u ON u.id = ug.user_id
ORDER BY ug.created_minute DESC;