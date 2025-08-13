-- PostgreSQL 스키마 for simple_slot
-- 이 파일은 캐시충전과 로그인/세션 관리를 위한 기본 테이블 구조입니다.

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'advertiser' CHECK (role IN ('advertiser', 'agency', 'distributor', 'operator', 'developer')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  bank_info JSONB,
  business JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 사용자 세션 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 리프레시 토큰 테이블
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 잔액 테이블
CREATE TABLE IF NOT EXISTS user_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  paid_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (paid_balance >= 0),
  free_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (free_balance >= 0),
  total_balance DECIMAL(15,2) GENERATED ALWAYS AS (paid_balance + free_balance) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 캐시 충전 요청 테이블
CREATE TABLE IF NOT EXISTS cash_charge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  bonus_percentage DECIMAL(5,2) DEFAULT 0 CHECK (bonus_percentage >= 0 AND bonus_percentage <= 100),
  bonus_amount DECIMAL(15,2) DEFAULT 0 CHECK (bonus_amount >= 0),
  deposit_at TIMESTAMPTZ,
  account_holder VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processor_id UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- 캐시 거래 내역 테이블
CREATE TABLE IF NOT EXISTS user_cash_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('charge', 'purchase', 'refund', 'withdrawal', 'bonus', 'expire')),
  amount DECIMAL(15,2) NOT NULL,
  balance_type VARCHAR(20) CHECK (balance_type IN ('paid', 'free', 'mixed')),
  description TEXT,
  reference_id UUID,
  transaction_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 캐시 전역 설정 테이블
CREATE TABLE IF NOT EXISTS cash_global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_bonus_percentage DECIMAL(5,2) DEFAULT 0 CHECK (default_bonus_percentage >= 0 AND default_bonus_percentage <= 100),
  min_charge_amount DECIMAL(15,2) DEFAULT 10000 CHECK (min_charge_amount >= 0),
  max_charge_amount DECIMAL(15,2) DEFAULT 10000000 CHECK (max_charge_amount >= min_charge_amount),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 캐시 사용자별 설정 테이블
CREATE TABLE IF NOT EXISTS cash_user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  custom_bonus_percentage DECIMAL(5,2) CHECK (custom_bonus_percentage >= 0 AND custom_bonus_percentage <= 100),
  default_account_holder VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_cash_charge_requests_user_id ON cash_charge_requests(user_id);
CREATE INDEX idx_cash_charge_requests_status ON cash_charge_requests(status);
CREATE INDEX idx_user_cash_history_user_id ON user_cash_history(user_id);
CREATE INDEX idx_user_cash_history_transaction_type ON user_cash_history(transaction_type);
CREATE INDEX idx_user_cash_history_transaction_at ON user_cash_history(transaction_at);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_global_settings_updated_at BEFORE UPDATE ON cash_global_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_user_settings_updated_at BEFORE UPDATE ON cash_user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 트리거: 신규 사용자 생성 시 잔액 테이블 자동 생성
CREATE OR REPLACE FUNCTION create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_balances (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_balance_trigger AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_balance();

-- 전역 설정 초기 데이터 (하나만 존재)
INSERT INTO cash_global_settings (default_bonus_percentage, min_charge_amount, max_charge_amount)
VALUES (10.0, 10000, 10000000)
ON CONFLICT DO NOTHING;

-- 트리거: 전역 설정은 하나만 존재하도록 강제
CREATE OR REPLACE FUNCTION enforce_single_global_setting()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM cash_global_settings) > 0 THEN
        RAISE EXCEPTION '전역 설정은 하나만 존재할 수 있습니다';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_global_setting_trigger BEFORE INSERT ON cash_global_settings
    FOR EACH ROW EXECUTE FUNCTION enforce_single_global_setting();