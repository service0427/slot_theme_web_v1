-- content 컬럼의 타입을 TEXT로 유지하되, HTML 컨텐츠를 저장
-- content_plain 컬럼 추가 (검색용 평문 텍스트)
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS content_plain TEXT;

-- 이미지 첨부를 위한 메타데이터 컬럼 추가
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 컨텐츠 타입 구분 컬럼 추가 (text/html)
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text';

-- 기존 데이터 마이그레이션 (plain text를 유지)
UPDATE announcements 
SET content_plain = content,
    content_type = 'text'
WHERE content_type IS NULL;

-- 검색용 인덱스 추가 (simple 텍스트 검색 설정 사용)
CREATE INDEX IF NOT EXISTS idx_announcements_content_plain 
ON announcements USING gin(to_tsvector('simple', content_plain));