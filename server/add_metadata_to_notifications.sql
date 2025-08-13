-- notifications 테이블에 metadata 컬럼 추가
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- metadata 컬럼에 인덱스 추가 (공지사항 필터링용)
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_announcement 
ON notifications((metadata->>'isAnnouncement')) 
WHERE metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_pinned 
ON notifications((metadata->>'pinned')) 
WHERE metadata IS NOT NULL;