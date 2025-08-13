-- 전체 알림의 사용자별 읽음 상태를 관리하는 테이블 생성
CREATE TABLE IF NOT EXISTS notification_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_composite ON notification_reads(notification_id, user_id);

-- 권한 부여
GRANT ALL PRIVILEGES ON TABLE notification_reads TO simple;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO simple;