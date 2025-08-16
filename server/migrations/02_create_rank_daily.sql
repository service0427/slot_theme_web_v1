-- rank_daily 테이블 생성
-- 일자별 슬롯 순위 데이터 스냅샷 저장용

CREATE TABLE IF NOT EXISTS rank_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- 슬롯 정보 스냅샷
  keyword VARCHAR(255),
  url VARCHAR(500),
  mid VARCHAR(100),
  
  -- URL 파싱 정보 (기존 parseUrl 함수 결과 저장)
  url_product_id VARCHAR(100),
  url_item_id VARCHAR(100), 
  url_vendor_item_id VARCHAR(100),
  
  -- 순위와 썸네일 정보
  rank INTEGER,
  first_rank INTEGER,
  thumbnail VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 하루에 슬롯당 하나의 스냅샷만 저장
  UNIQUE(slot_id, date)
);

-- 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_rank_daily_slot_id ON rank_daily(slot_id);
CREATE INDEX IF NOT EXISTS idx_rank_daily_date ON rank_daily(date DESC);