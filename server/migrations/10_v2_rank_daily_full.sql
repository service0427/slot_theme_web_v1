-- ========================================
-- v2_rank_daily 테이블 및 관련 함수 전체 마이그레이션
-- 작성일: 2025-01-26
-- 설명: rank_daily를 최적화한 v2 버전 - 중복 제거 및 성능 개선
-- ========================================

-- 1. v2_rank_daily 테이블 생성
-- 기존 rank_daily와 달리 date + keyword + product_id + item_id + vendor_item_id를 키로 사용
DROP TABLE IF EXISTS v2_rank_daily CASCADE;

CREATE TABLE v2_rank_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    
    -- URL 파싱 정보 (쿠팡 상품 식별자)
    product_id VARCHAR(100),
    item_id VARCHAR(100),
    vendor_item_id VARCHAR(100),
    
    -- 순위 정보
    rank INTEGER,
    prev_rank INTEGER,  -- 이전 날짜의 순위
    
    -- 상품 정보
    product_name VARCHAR(500),
    rating DECIMAL(3,2),
    review_count INTEGER,
    thumbnail VARCHAR(500),
    url VARCHAR(500),
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약: 같은 날짜, 키워드, 상품ID 조합은 하나만 존재
    UNIQUE(date, keyword, product_id, item_id, vendor_item_id)
);

-- 인덱스 생성
CREATE INDEX idx_v2_rank_daily_date ON v2_rank_daily(date DESC);
CREATE INDEX idx_v2_rank_daily_keyword ON v2_rank_daily(keyword);
CREATE INDEX idx_v2_rank_daily_product_ids ON v2_rank_daily(product_id, item_id, vendor_item_id);
CREATE INDEX idx_v2_rank_daily_date_keyword ON v2_rank_daily(date, keyword);
CREATE INDEX idx_v2_rank_daily_rank ON v2_rank_daily(rank) WHERE rank IS NOT NULL;

-- ========================================
-- 2. 상품 정보 UPSERT 함수
-- 상품 기본정보를 v2_rank_daily에 저장/업데이트
-- ========================================
CREATE OR REPLACE FUNCTION v2_upsert_product_info(
    p_date DATE,
    p_keyword VARCHAR(255),
    p_product_id VARCHAR(100),
    p_item_id VARCHAR(100),
    p_vendor_item_id VARCHAR(100),
    p_product_name VARCHAR(500),
    p_thumbnail VARCHAR(500)
) RETURNS void AS $$
BEGIN
    INSERT INTO v2_rank_daily (
        date,
        keyword,
        product_id,
        item_id,
        vendor_item_id,
        product_name,
        thumbnail,
        updated_at
    ) VALUES (
        p_date,
        p_keyword,
        p_product_id,
        p_item_id,
        p_vendor_item_id,
        p_product_name,
        p_thumbnail,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (date, keyword, product_id, item_id, vendor_item_id)
    DO UPDATE SET
        product_name = COALESCE(EXCLUDED.product_name, v2_rank_daily.product_name),
        thumbnail = COALESCE(EXCLUDED.thumbnail, v2_rank_daily.thumbnail),
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. 순위 정보 UPSERT 함수
-- 순위 관련 정보를 v2_rank_daily에 저장/업데이트
-- prev_rank 자동 계산 포함
-- ========================================
CREATE OR REPLACE FUNCTION v2_upsert_rank_info(
    p_date DATE,
    p_keyword VARCHAR(255),
    p_product_id VARCHAR(100),
    p_item_id VARCHAR(100),
    p_vendor_item_id VARCHAR(100),
    p_rank INTEGER,
    p_rating DECIMAL(3,2),
    p_review_count INTEGER
) RETURNS void AS $$
DECLARE
    v_prev_rank INTEGER;
BEGIN
    -- 이전 날짜의 순위 조회
    SELECT rank INTO v_prev_rank
    FROM v2_rank_daily
    WHERE date < p_date
      AND keyword = p_keyword
      AND product_id = p_product_id
      AND item_id = p_item_id
      AND vendor_item_id = p_vendor_item_id
    ORDER BY date DESC
    LIMIT 1;
    
    -- UPSERT 실행
    INSERT INTO v2_rank_daily (
        date,
        keyword,
        product_id,
        item_id,
        vendor_item_id,
        rank,
        prev_rank,
        rating,
        review_count,
        updated_at
    ) VALUES (
        p_date,
        p_keyword,
        p_product_id,
        p_item_id,
        p_vendor_item_id,
        p_rank,
        v_prev_rank,
        p_rating,
        p_review_count,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (date, keyword, product_id, item_id, vendor_item_id)
    DO UPDATE SET
        rank = COALESCE(EXCLUDED.rank, v2_rank_daily.rank),
        prev_rank = COALESCE(EXCLUDED.prev_rank, v2_rank_daily.prev_rank),
        rating = COALESCE(EXCLUDED.rating, v2_rank_daily.rating),
        review_count = COALESCE(EXCLUDED.review_count, v2_rank_daily.review_count),
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 기존 rank_daily 데이터를 v2_rank_daily로 마이그레이션
-- (필요한 경우에만 실행)
-- ========================================
-- 주의: 이 쿼리는 기존 데이터가 있을 때만 실행하세요
/*
INSERT INTO v2_rank_daily (
    date,
    keyword,
    product_id,
    item_id,
    vendor_item_id,
    rank,
    product_name,
    thumbnail,
    url,
    created_at,
    updated_at
)
SELECT DISTINCT ON (date, keyword, url_product_id, url_item_id, url_vendor_item_id)
    date,
    keyword,
    url_product_id AS product_id,
    url_item_id AS item_id,
    url_vendor_item_id AS vendor_item_id,
    rank,
    -- product_name은 추후 외부 DB에서 가져올 예정
    NULL AS product_name,
    thumbnail,
    url,
    MIN(created_at) AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM rank_daily
WHERE url_product_id IS NOT NULL 
  AND url_item_id IS NOT NULL 
  AND url_vendor_item_id IS NOT NULL
GROUP BY 
    date, 
    keyword, 
    url_product_id, 
    url_item_id, 
    url_vendor_item_id,
    rank,
    thumbnail,
    url
ORDER BY 
    date, 
    keyword, 
    url_product_id, 
    url_item_id, 
    url_vendor_item_id,
    MIN(created_at);
*/

-- ========================================
-- 5. slots와 연결하기 위한 VIEW 생성
-- API에서 사용할 슬롯-순위 조인 뷰
-- ========================================
CREATE OR REPLACE VIEW v2_slots_with_rank AS
SELECT 
    s.*,
    rd.rank as current_rank,
    rd.prev_rank,
    rd.product_name,
    rd.rating,
    rd.review_count,
    rd.thumbnail as rank_thumbnail,
    rd.date as rank_date,
    CASE 
        WHEN rd.prev_rank IS NULL THEN 'new'
        WHEN rd.rank < rd.prev_rank THEN 'up'
        WHEN rd.rank > rd.prev_rank THEN 'down'
        ELSE 'same'
    END as rank_trend
FROM slots s
LEFT JOIN LATERAL (
    SELECT *
    FROM v2_rank_daily rd
    WHERE rd.keyword = s.keyword
      AND rd.product_id = (
          CASE 
              WHEN s.url ~ '/products/(\d+)' 
              THEN (regexp_match(s.url, '/products/(\d+)'))[1]
              ELSE NULL
          END
      )
      AND rd.item_id = (
          CASE 
              WHEN s.url ~ '[?&]itemId=(\d+)' 
              THEN (regexp_match(s.url, '[?&]itemId=(\d+)'))[1]
              ELSE NULL
          END
      )
      AND rd.vendor_item_id = (
          CASE 
              WHEN s.url ~ '[?&]vendorItemId=(\d+)' 
              THEN (regexp_match(s.url, '[?&]vendorItemId=(\d+)'))[1]
              ELSE NULL
          END
      )
    ORDER BY rd.date DESC
    LIMIT 1
) rd ON true;

-- ========================================
-- 6. 통계 및 분석용 헬퍼 함수들
-- ========================================

-- 특정 키워드의 날짜별 순위 변화 조회
CREATE OR REPLACE FUNCTION get_keyword_rank_history(
    p_keyword VARCHAR(255),
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    date DATE,
    product_id VARCHAR(100),
    item_id VARCHAR(100),
    vendor_item_id VARCHAR(100),
    product_name VARCHAR(500),
    rank INTEGER,
    prev_rank INTEGER,
    trend VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rd.date,
        rd.product_id,
        rd.item_id,
        rd.vendor_item_id,
        rd.product_name,
        rd.rank,
        rd.prev_rank,
        CASE 
            WHEN rd.prev_rank IS NULL THEN 'new'::VARCHAR(10)
            WHEN rd.rank < rd.prev_rank THEN 'up'::VARCHAR(10)
            WHEN rd.rank > rd.prev_rank THEN 'down'::VARCHAR(10)
            ELSE 'same'::VARCHAR(10)
        END as trend
    FROM v2_rank_daily rd
    WHERE rd.keyword = p_keyword
      AND rd.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    ORDER BY rd.date DESC, rd.rank ASC;
END;
$$ LANGUAGE plpgsql;

-- 데이터 압축률 확인 (마이그레이션 효과 측정용)
CREATE OR REPLACE FUNCTION check_v2_compression_rate()
RETURNS TABLE (
    original_count BIGINT,
    v2_count BIGINT,
    compression_rate DECIMAL(5,2),
    saved_rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH original AS (
        SELECT COUNT(*) as cnt FROM rank_daily
    ),
    v2 AS (
        SELECT COUNT(*) as cnt FROM v2_rank_daily
    )
    SELECT 
        o.cnt as original_count,
        v.cnt as v2_count,
        CASE 
            WHEN o.cnt > 0 THEN 
                ROUND(((o.cnt - v.cnt)::DECIMAL / o.cnt) * 100, 2)
            ELSE 0
        END as compression_rate,
        (o.cnt - v.cnt) as saved_rows
    FROM original o, v2 v;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. 권한 설정
-- ========================================
-- simple 사용자에게 필요한 권한 부여
GRANT ALL ON TABLE v2_rank_daily TO simple;
GRANT ALL ON SEQUENCE v2_rank_daily_id_seq TO simple;
GRANT EXECUTE ON FUNCTION v2_upsert_product_info TO simple;
GRANT EXECUTE ON FUNCTION v2_upsert_rank_info TO simple;
GRANT EXECUTE ON FUNCTION get_keyword_rank_history TO simple;
GRANT EXECUTE ON FUNCTION check_v2_compression_rate TO simple;
GRANT SELECT ON v2_slots_with_rank TO simple;

-- ========================================
-- 실행 확인용 쿼리
-- ========================================
-- 테이블 생성 확인
SELECT 'v2_rank_daily 테이블 생성 완료' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'v2_rank_daily'
);

-- 함수 생성 확인
SELECT 
    routine_name,
    'created' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'v2_upsert_product_info', 
    'v2_upsert_rank_info',
    'get_keyword_rank_history',
    'check_v2_compression_rate'
)
ORDER BY routine_name;

-- 인덱스 생성 확인
SELECT 
    indexname,
    'created' as status
FROM pg_indexes 
WHERE tablename = 'v2_rank_daily'
ORDER BY indexname;