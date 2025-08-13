-- system_settings 테이블 생성
-- 시스템 전체 설정을 관리하는 테이블

-- 기존 테이블이 있다면 삭제
DROP TABLE IF EXISTS system_settings;

-- system_settings 테이블 생성
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('theme', 'field', 'business', 'feature')),
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- 카테고리별 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- 초기 데이터 삽입

-- 테마 설정
INSERT INTO system_settings (key, value, category, description) VALUES
('globalTheme', '"simple"', 'theme', '시스템 전체 테마'),
('globalLayout', '"classic"', 'theme', '시스템 전체 레이아웃');

-- 비즈니스 설정
INSERT INTO system_settings (key, value, category, description) VALUES
('useCashSystem', 'true', 'business', '캐시 시스템 사용 여부'),
('cashChargeMode', '"modal"', 'business', '캐시 충전 방식 (modal/page)'),
('defaultSlotPrice', '50000', 'business', '기본 슬롯 가격'),
('minCashCharge', '10000', 'business', '최소 충전 금액'),
('maxCashCharge', '1000000', 'business', '최대 충전 금액'),
('slotAutoApproval', 'false', 'business', '슬롯 자동 승인'),
('cashAutoApproval', 'false', 'business', '캐시 충전 자동 승인'),
('maxSlotsPerUser', '100', 'business', '사용자당 최대 슬롯 수'),
('maintenanceMode', 'false', 'business', '유지보수 모드'),
('registrationEnabled', 'true', 'business', '회원가입 허용');

-- 기능 설정
INSERT INTO system_settings (key, value, category, description) VALUES
('chatEnabled', 'false', 'feature', '채팅 기능 활성화'),
('chatMaxMessages', '100', 'feature', '채팅 최대 메시지 수'),
('chatSoundEnabled', 'true', 'feature', '채팅 알림음'),
('notificationEnabled', 'true', 'feature', '알림 활성화'),
('notificationSound', 'true', 'feature', '알림음'),
('notificationAutoRead', 'false', 'feature', '알림 자동 읽음'),
('notificationDuration', '5000', 'feature', '알림 표시 시간(ms)'),
('featureCashHistory', 'true', 'feature', '캐시 내역 기능'),
('featureRanking', 'true', 'feature', '랭킹 기능'),
('featureSlotManagement', 'true', 'feature', '슬롯 관리 기능');

-- 권한 설정
GRANT ALL ON system_settings TO simple;
GRANT SELECT ON system_settings TO PUBLIC;

-- 주석 추가
COMMENT ON TABLE system_settings IS '시스템 전체 설정 테이블';
COMMENT ON COLUMN system_settings.key IS '설정 키';
COMMENT ON COLUMN system_settings.value IS '설정 값 (JSONB 형식)';
COMMENT ON COLUMN system_settings.category IS '설정 카테고리 (theme/field/business/feature)';
COMMENT ON COLUMN system_settings.description IS '설정 설명';
COMMENT ON COLUMN system_settings.updated_at IS '마지막 수정 시간';
COMMENT ON COLUMN system_settings.updated_by IS '마지막 수정자';