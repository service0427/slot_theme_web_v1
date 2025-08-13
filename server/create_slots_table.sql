-- 슬롯 테이블 생성
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_url VARCHAR(500) NOT NULL,
  daily_budget DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_created_at ON slots(created_at DESC);

-- 슬롯 상태: pending(대기), active(활성), paused(일시정지), rejected(거절), deleted(삭제)