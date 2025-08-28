#!/bin/bash

# v3 쿼리 디버깅 스크립트
# 사용법: ./debug_v3_query.sh [키워드] [product_id] [item_id] [vendor_item_id]

source "$(dirname "$0")/sync.config"

# 파라미터
KEYWORD="${1:-생수}"
PRODUCT_ID="${2:-8544294372}"
ITEM_ID="${3:-24738980725}"
VENDOR_ITEM_ID="${4:-93277125897}"
CHECK_DATE="${5:-2025-08-28}"

echo "========================================="
echo "v3 쿼리 디버깅"
echo "========================================="
echo "키워드: $KEYWORD"
echo "상품ID: $PRODUCT_ID / $ITEM_ID / $VENDOR_ITEM_ID"
echo "날짜: $CHECK_DATE"
echo ""

echo "1) 기본 데이터 확인:"
PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB <<EOF
SELECT 
    keyword, product_id, item_id, vendor_item_id,
    progress_date, site_code, rcheck_count, is_rcheck_completed,
    min_rank, latest_rank, 
    CASE 
        WHEN rank_data IS NULL THEN 'NULL'
        WHEN rank_data::text = '[]' THEN '빈배열'
        ELSE '데이터있음(' || jsonb_array_length(rank_data)::text || '개)'
    END as rank_data_status
FROM v2_slot_tasks_daily_progress 
WHERE keyword = '$KEYWORD'
  AND product_id = '$PRODUCT_ID'
  AND progress_date = '$CHECK_DATE'
  AND site_code = 'cpck';
EOF

echo ""
echo "2) rank_history CTE 테스트:"
PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB <<EOF
WITH rank_history AS (
    SELECT 
        *,
        LAG(latest_rank) OVER (ORDER BY progress_date) as yesterday_rank
    FROM v2_slot_tasks_daily_progress
    WHERE keyword = '$KEYWORD'
      AND product_id = '$PRODUCT_ID'
      AND (item_id = '$ITEM_ID' OR item_id IS NULL OR item_id = '' OR '$ITEM_ID' = '')
      AND (vendor_item_id = '$VENDOR_ITEM_ID' OR vendor_item_id IS NULL OR vendor_item_id = '' OR '$VENDOR_ITEM_ID' = '')
      AND progress_date >= '$CHECK_DATE'::date - interval '1 day'
      AND progress_date <= '$CHECK_DATE'::date
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
)
SELECT 
    'rank_history 결과' as step,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN progress_date = '$CHECK_DATE' THEN 1 END) as today_rows,
    COUNT(CASE WHEN rcheck_count > 9 THEN 1 END) as valid_rcheck
FROM rank_history;
EOF

echo ""
echo "3) today_data CTE 테스트:"
PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB <<EOF
WITH rank_history AS (
    SELECT 
        *,
        LAG(latest_rank) OVER (ORDER BY progress_date) as yesterday_rank
    FROM v2_slot_tasks_daily_progress
    WHERE keyword = '$KEYWORD'
      AND product_id = '$PRODUCT_ID'
      AND (item_id = '$ITEM_ID' OR item_id IS NULL OR item_id = '' OR '$ITEM_ID' = '')
      AND (vendor_item_id = '$VENDOR_ITEM_ID' OR vendor_item_id IS NULL OR vendor_item_id = '' OR '$VENDOR_ITEM_ID' = '')
      AND progress_date >= '$CHECK_DATE'::date - interval '1 day'
      AND progress_date <= '$CHECK_DATE'::date
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
),
today_data AS (
    SELECT 
        rank_data,
        yesterday_rank,
        latest_rank,
        min_rank,
        rating,
        review_count,
        rcheck_count
    FROM rank_history
    WHERE progress_date = '$CHECK_DATE'
      AND rcheck_count > 9
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
    ORDER BY rcheck_count DESC
    LIMIT 1
)
SELECT 
    'today_data 결과' as step,
    COUNT(*) as row_count,
    min_rank,
    latest_rank,
    CASE 
        WHEN rank_data IS NULL THEN 'NULL'
        ELSE 'EXISTS'
    END as rank_data_exists
FROM today_data
GROUP BY min_rank, latest_rank, rank_data;
EOF

echo ""
echo "4) rank_data 배열 처리 테스트:"
PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB <<EOF
SELECT 
    rank_data,
    jsonb_array_length(rank_data) as array_length,
    (SELECT ARRAY(
        SELECT DISTINCT (elem->>'rank')::integer 
        FROM jsonb_array_elements(rank_data) elem 
        WHERE elem->>'rank' IS NOT NULL
        ORDER BY (elem->>'rank')::integer
    )) as ranks_array
FROM v2_slot_tasks_daily_progress
WHERE keyword = '$KEYWORD'
  AND product_id = '$PRODUCT_ID'
  AND progress_date = '$CHECK_DATE'
  AND site_code = 'cpck'
  AND is_rcheck_completed = true
  AND rcheck_count > 9
LIMIT 1;
EOF

echo ""
echo "5) 최종 쿼리 (스크립트에서 실행되는 것과 동일):"
PGPASSWORD=$EXTERNAL_PASS psql -h $EXTERNAL_HOST -p $EXTERNAL_PORT -U $EXTERNAL_USER -d $EXTERNAL_DB -t -A -F'|' <<EOF
WITH rank_history AS (
    SELECT 
        *,
        LAG(latest_rank) OVER (ORDER BY progress_date) as yesterday_rank
    FROM v2_slot_tasks_daily_progress
    WHERE keyword = '$KEYWORD'
      AND product_id = '$PRODUCT_ID'
      AND (item_id = '$ITEM_ID' OR item_id IS NULL OR item_id = '' OR '$ITEM_ID' = '')
      AND (vendor_item_id = '$VENDOR_ITEM_ID' OR vendor_item_id IS NULL OR vendor_item_id = '' OR '$VENDOR_ITEM_ID' = '')
      AND progress_date >= '$CHECK_DATE'::date - interval '1 day'
      AND progress_date <= '$CHECK_DATE'::date
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
),
today_data AS (
    SELECT 
        ARRAY(
            SELECT DISTINCT (elem->>'rank')::integer 
            FROM jsonb_array_elements(rank_data) elem 
            WHERE elem->>'rank' IS NOT NULL
            ORDER BY (elem->>'rank')::integer
        ) as ranks_array,
        yesterday_rank,
        latest_rank,
        min_rank,
        rating,
        review_count,
        rcheck_count
    FROM rank_history
    WHERE progress_date = '$CHECK_DATE'
      AND rcheck_count > 9
      AND site_code = 'cpck'
      AND is_rcheck_completed = true
    ORDER BY rcheck_count DESC
    LIMIT 1
)
SELECT 
    ARRAY_TO_STRING(ranks_array, ',') as available_ranks,
    COALESCE(yesterday_rank, 0) as yesterday_rank,
    COALESCE(min_rank, 0) as min_rank,
    COALESCE(
        CASE 
            WHEN array_length(ranks_array, 1) > 0 THEN
                CASE
                    WHEN yesterday_rank IS NOT NULL THEN
                        COALESCE(
                            (SELECT MAX(r) FROM unnest(ranks_array) r WHERE r <= yesterday_rank),
                            (SELECT MIN(r) FROM unnest(ranks_array) r)
                        )
                    ELSE
                        (SELECT MAX(r) FROM unnest(ranks_array) r)
                END
            ELSE latest_rank
        END, 0
    ) as calculated_rank,
    COALESCE(rating, 0) as rating,
    COALESCE(review_count, 0) as review_count,
    CASE 
        WHEN yesterday_rank IS NOT NULL THEN '어제 순위 있음'
        ELSE '어제 순위 없음'
    END as rank_reason
FROM today_data;
EOF

echo ""
echo "결과: $?"