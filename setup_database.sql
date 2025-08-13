-- PostgreSQL 데이터베이스 및 사용자 설정
-- 이 스크립트를 postgres 사용자로 실행하세요
-- psql -h localhost -d postgres -f setup_database.sql

-- 사용자 생성 (이미 존재하는 경우 무시)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE usename = 'simple') THEN
      CREATE USER simple WITH PASSWORD 'Tech1324!';
   END IF;
END
$do$;

-- 데이터베이스 생성 (이미 존재하는 경우 무시)
SELECT 'CREATE DATABASE simple'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'simple')\gexec

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE simple TO simple;

-- simple 데이터베이스로 전환
\c simple

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 슬롯 테이블
CREATE TABLE IF NOT EXISTS slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'support', -- support, group 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 채팅방 참여자 테이블
CREATE TABLE IF NOT EXISTS chat_participants (
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- UUID 또는 시스템 ID (support_1 등)
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 메시지 읽음 상태 테이블
CREATE TABLE IF NOT EXISTS message_reads (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- 테이블 소유권 변경
ALTER TABLE users OWNER TO simple;
ALTER TABLE slots OWNER TO simple;
ALTER TABLE chat_rooms OWNER TO simple;
ALTER TABLE chat_participants OWNER TO simple;
ALTER TABLE messages OWNER TO simple;
ALTER TABLE message_reads OWNER TO simple;

-- 초기 데이터는 별도 스크립트로 관리
-- createAdmin.ts 스크립트를 사용하여 관리자 계정 생성

-- 성공 메시지
\echo '데이터베이스 설정이 완료되었습니다!'