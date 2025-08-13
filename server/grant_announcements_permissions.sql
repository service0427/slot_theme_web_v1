-- simple 사용자에게 announcements 관련 테이블 권한 부여
GRANT ALL PRIVILEGES ON TABLE announcements TO simple;
GRANT ALL PRIVILEGES ON TABLE announcement_reads TO simple;

-- 시퀀스 권한도 부여 (ID 생성을 위해)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO simple;

-- 향후 생성될 테이블에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON TABLES TO simple;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON SEQUENCES TO simple;