-- 기존 테이블 삭제
DROP TABLE IF EXISTS slots CASCADE;

-- 슬롯 테이블 생성
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  mid VARCHAR(100),
  daily_budget DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  -- 사용자별 seq 중복 방지
  UNIQUE(user_id, seq)
);

-- 인덱스 생성
CREATE INDEX idx_slots_user_id ON slots(user_id);
CREATE INDEX idx_slots_status ON slots(status);
CREATE INDEX idx_slots_created_at ON slots(created_at DESC);
CREATE INDEX idx_slots_keyword ON slots(keyword);

-- 사용자별 seq를 자동으로 증가시키는 함수
CREATE OR REPLACE FUNCTION get_next_seq_for_user(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM slots
  WHERE user_id = p_user_id;
  
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- 슬롯 상태: pending(대기), active(활성), paused(일시정지), rejected(거절), deleted(삭제)