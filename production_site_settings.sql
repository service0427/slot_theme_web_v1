-- 실서버용 사이트 정보 설정 추가
INSERT INTO system_settings (key, value, category, description) 
VALUES 
  ('siteName', '"CPC"', 'business', '사이트 이름'),
  ('siteTitle', '"슬롯 관리 시스템"', 'business', '사이트 부제목')
ON CONFLICT (key, category) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;