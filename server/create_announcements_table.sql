-- 공지사항 테이블 생성
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- general, event, update, maintenance
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_pinned BOOLEAN DEFAULT false, -- 상단 고정 여부
    is_active BOOLEAN DEFAULT true, -- 활성화 여부
    author_id VARCHAR(255) NOT NULL, -- 작성자 ID
    author_name VARCHAR(255) NOT NULL, -- 작성자 이름
    view_count INTEGER DEFAULT 0, -- 조회수
    start_date TIMESTAMP, -- 게시 시작일
    end_date TIMESTAMP, -- 게시 종료일
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_announcements_active ON announcements(is_active, is_pinned DESC, created_at DESC);
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_announcements_dates ON announcements(start_date, end_date);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- 공지사항 읽음 표시 테이블
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id)
);

-- 읽음 표시 인덱스
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);