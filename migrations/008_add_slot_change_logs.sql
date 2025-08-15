-- 슬롯 변경 로그 테이블 추가
-- 생성일: 2025-08-14
-- 설명: 슬롯 정보 변경 사항을 추적하기 위한 로그 테이블

-- UUID 확장 활성화 (이미 있을 수 있으므로 IF NOT EXISTS 사용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 슬롯 변경 로그 테이블
CREATE TABLE IF NOT EXISTS slot_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL,
    user_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'field_update', 'status_change', 'fill_empty', 'approve', 'reject', 'refund' 등
    field_key VARCHAR(100), -- 변경된 필드명 (여러 필드 변경시 JSON 배열)
    old_value TEXT, -- 이전 값 (JSON 형태로 저장)
    new_value TEXT, -- 새로운 값 (JSON 형태로 저장)
    description TEXT, -- 변경 설명
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT slot_change_logs_change_type_check CHECK (
        change_type IN ('field_update', 'status_change', 'fill_empty', 'approve', 'reject', 'refund')
    )
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_slot_change_logs_slot_id ON slot_change_logs(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_change_logs_user_id ON slot_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_change_logs_created_at ON slot_change_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_slot_change_logs_change_type ON slot_change_logs(change_type);

-- 외래 키 제약 조건 (slots 테이블과 users 테이블 참조)
ALTER TABLE slot_change_logs 
ADD CONSTRAINT fk_slot_change_logs_slot_id 
FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE;

ALTER TABLE slot_change_logs 
ADD CONSTRAINT fk_slot_change_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 주석 추가
COMMENT ON TABLE slot_change_logs IS '슬롯 정보 변경 로그 테이블';
COMMENT ON COLUMN slot_change_logs.change_type IS '변경 타입: field_update(필드변경), status_change(상태변경), fill_empty(빈슬롯채우기), approve(승인), reject(거절), refund(환불)';
COMMENT ON COLUMN slot_change_logs.field_key IS '변경된 필드명 (여러 필드 변경시 JSON 배열)';
COMMENT ON COLUMN slot_change_logs.old_value IS '이전 값 (JSON 형태로 저장)';
COMMENT ON COLUMN slot_change_logs.new_value IS '새로운 값 (JSON 형태로 저장)';