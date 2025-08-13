-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'system', 'operator', 또는 사용자 ID
    recipient_id VARCHAR(255) NOT NULL, -- 'all' 또는 특정 사용자 ID
    auto_close BOOLEAN DEFAULT true,
    duration INTEGER DEFAULT 5000,
    priority VARCHAR(20) DEFAULT 'normal',
    icon VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_sender ON notifications(sender);
CREATE INDEX idx_notifications_read_status ON notifications(recipient_id, read_at);