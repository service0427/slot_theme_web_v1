-- =============================================================================
-- 프로덕션 데이터베이스 초기 설정 SQL
-- 생성일: 2025-08-13
-- 설명: 새로운 DB 서버에 바로 설치 가능한 SQL 파일
--       admin 계정, field_configs, system_settings 데이터 포함
-- =============================================================================

-- 데이터베이스 생성 (필요한 경우 주석 해제)
-- CREATE DATABASE simple;
-- \c simple;

-- =============================================================================
-- 1. 확장 모듈 설치
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- =============================================================================
-- 2. 함수 생성
-- =============================================================================

-- 사용자별 시퀀스 번호 생성 함수
CREATE FUNCTION public.get_next_seq_for_user(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM pre_allocated_slots
  WHERE user_id = p_user_id;
  
  RETURN next_seq;
END;
$$;

-- 트리거 함수
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. 테이블 생성
-- =============================================================================

-- 사용자 테이블
CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(100),
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(20),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'operator'::character varying])::text[])))
);

-- 캐시 충전 요청 테이블
CREATE TABLE public.cash_charge_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    request_amount integer NOT NULL,
    approved_amount integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    bank_name character varying(50),
    account_holder character varying(100),
    request_message text,
    admin_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamp with time zone,
    approved_by uuid,
    processed_at timestamp with time zone,
    CONSTRAINT cash_charge_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'canceled'::character varying])::text[])))
);

-- 캐시 히스토리 테이블
CREATE TABLE public.cash_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    transaction_type character varying(20) NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    description text,
    reference_id uuid,
    reference_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cash_history_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['charge'::character varying, 'slot_purchase'::character varying, 'slot_refund'::character varying, 'withdrawal'::character varying, 'admin_adjustment'::character varying])::text[])))
);

-- 채팅 메시지 테이블
CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 채팅룸 테이블
CREATE TABLE public.chat_rooms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    room_type character varying(20) DEFAULT 'support'::character varying NOT NULL,
    title character varying(100),
    created_by uuid NOT NULL,
    operator_id uuid,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'waiting'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_rooms_room_type_check CHECK (((room_type)::text = ANY ((ARRAY['support'::character varying, 'direct'::character varying])::text[]))),
    CONSTRAINT chat_rooms_status_check CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);

-- 필드 설정 테이블
CREATE TABLE public.field_configs (
    id integer NOT NULL,
    field_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    field_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    is_required boolean DEFAULT false,
    is_enabled boolean DEFAULT true,
    show_in_list boolean DEFAULT true,
    is_searchable boolean DEFAULT false,
    placeholder text,
    validation_rule text,
    options json,
    default_value text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_system_generated boolean DEFAULT false,
    CONSTRAINT field_configs_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'select'::character varying, 'date'::character varying, 'url'::character varying, 'email'::character varying, 'phone'::character varying, 'textarea'::character varying])::text[])))
);

-- 필드 설정 시퀀스
CREATE SEQUENCE public.field_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.field_configs_id_seq OWNED BY public.field_configs.id;

-- 선발행 슬롯 테이블
CREATE TABLE public.pre_allocated_slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seq integer NOT NULL,
    user_id uuid NOT NULL,
    slot_data json NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT pre_allocated_slots_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'active'::character varying, 'expired'::character varying])::text[])))
);

-- 슬롯 테이블
CREATE TABLE public.slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seq integer NOT NULL,
    created_by uuid NOT NULL,
    slot_data json NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT slots_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'deleted'::character varying])::text[])))
);

-- 시스템 설정 테이블
CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    category character varying(50) DEFAULT 'theme'::character varying NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    CONSTRAINT system_settings_category_check CHECK (((category)::text = ANY ((ARRAY['theme'::character varying, 'field'::character varying, 'business'::character varying, 'feature'::character varying])::text[])))
);

-- 사용자 슬롯 할당 테이블
CREATE TABLE public.user_slot_allocations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    allocated_slots integer DEFAULT 0 NOT NULL,
    used_slots integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 슬롯 테이블
CREATE TABLE public.user_slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    slot_id uuid NOT NULL,
    user_id uuid NOT NULL,
    seq integer NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    price integer DEFAULT 0,
    slot_data json,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_slots_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'active'::character varying, 'expired'::character varying])::text[])))
);

-- 월렛 테이블
CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. 기본 키 설정
-- =============================================================================

ALTER TABLE ONLY public.cash_charge_requests
    ADD CONSTRAINT cash_charge_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cash_history
    ADD CONSTRAINT cash_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.field_configs
    ADD CONSTRAINT field_configs_field_key_key UNIQUE (field_key);

ALTER TABLE ONLY public.field_configs
    ADD CONSTRAINT field_configs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pre_allocated_slots
    ADD CONSTRAINT pre_allocated_slots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pre_allocated_slots
    ADD CONSTRAINT pre_allocated_slots_user_id_seq_key UNIQUE (user_id, seq);

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_created_by_seq_key UNIQUE (created_by, seq);

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.user_slot_allocations
    ADD CONSTRAINT user_slot_allocations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_slot_allocations
    ADD CONSTRAINT user_slot_allocations_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.user_slots
    ADD CONSTRAINT user_slots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_slots
    ADD CONSTRAINT user_slots_user_id_seq_key UNIQUE (user_id, seq);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

-- =============================================================================
-- 5. 시퀀스 설정
-- =============================================================================

ALTER TABLE public.field_configs ALTER COLUMN id SET DEFAULT nextval('public.field_configs_id_seq'::regclass);

-- =============================================================================
-- 6. 인덱스 생성
-- =============================================================================

CREATE INDEX idx_cash_charge_requests_status ON public.cash_charge_requests USING btree (status);
CREATE INDEX idx_cash_charge_requests_user_id ON public.cash_charge_requests USING btree (user_id);
CREATE INDEX idx_cash_history_user_id ON public.cash_history USING btree (user_id);
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages USING btree (room_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);
CREATE INDEX idx_chat_rooms_created_by ON public.chat_rooms USING btree (created_by);
CREATE INDEX idx_chat_rooms_operator_id ON public.chat_rooms USING btree (operator_id);
CREATE INDEX idx_pre_allocated_slots_status ON public.pre_allocated_slots USING btree (status);
CREATE INDEX idx_pre_allocated_slots_user_id ON public.pre_allocated_slots USING btree (user_id);
CREATE INDEX idx_slots_created_by ON public.slots USING btree (created_by);
CREATE INDEX idx_slots_status ON public.slots USING btree (status);
CREATE INDEX idx_user_slots_slot_id ON public.user_slots USING btree (slot_id);
CREATE INDEX idx_user_slots_status ON public.user_slots USING btree (status);
CREATE INDEX idx_user_slots_user_id ON public.user_slots USING btree (user_id);

-- =============================================================================
-- 7. 외래 키 제약 조건
-- =============================================================================

ALTER TABLE ONLY public.cash_charge_requests
    ADD CONSTRAINT cash_charge_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.cash_charge_requests
    ADD CONSTRAINT cash_charge_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.cash_history
    ADD CONSTRAINT cash_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.pre_allocated_slots
    ADD CONSTRAINT pre_allocated_slots_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.pre_allocated_slots
    ADD CONSTRAINT pre_allocated_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.user_slot_allocations
    ADD CONSTRAINT user_slot_allocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.user_slots
    ADD CONSTRAINT user_slots_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.user_slots
    ADD CONSTRAINT user_slots_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id);

ALTER TABLE ONLY public.user_slots
    ADD CONSTRAINT user_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- =============================================================================
-- 8. 트리거 설정
-- =============================================================================

CREATE TRIGGER update_cash_charge_requests_updated_at BEFORE UPDATE ON public.cash_charge_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_field_configs_updated_at BEFORE UPDATE ON public.field_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pre_allocated_slots_updated_at BEFORE UPDATE ON public.pre_allocated_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_slots_updated_at BEFORE UPDATE ON public.slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_slot_allocations_updated_at BEFORE UPDATE ON public.user_slot_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_slots_updated_at BEFORE UPDATE ON public.user_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 9. 초기 데이터 삽입
-- =============================================================================

-- Admin 사용자 삽입
INSERT INTO public.users (id, email, password, full_name, role, is_active, created_at, updated_at, phone) VALUES
('4c085f0c-be5d-43a8-8c37-7084ffe4a9c3', 'admin@admin.com', '$2b$10$ELjTRRtc/WJz.Uu3Uv3z1u4K2ZrKqWL/OQ30bdJpLElaftdw.HIyi', '시스템 관리자', 'operator', true, '2025-08-05 21:32:39.193894+09', '2025-08-13 11:30:59.254544+09', NULL);

-- Admin 사용자 월렛 생성
INSERT INTO public.wallets (user_id, balance) VALUES
('4c085f0c-be5d-43a8-8c37-7084ffe4a9c3', 0);

-- Admin 사용자 슬롯 할당 정보 생성
INSERT INTO public.user_slot_allocations (user_id, allocated_slots, used_slots) VALUES
('4c085f0c-be5d-43a8-8c37-7084ffe4a9c3', 0, 0);

-- Field Configs 삽입
INSERT INTO public.field_configs (id, field_key, label, field_type, is_required, is_enabled, show_in_list, is_searchable, placeholder, validation_rule, options, default_value, display_order, created_at, updated_at, is_system_generated) VALUES
(1, 'keyword', '키워드', 'text', true, true, true, true, NULL, NULL, NULL, NULL, 1, '2025-08-11 11:22:34.528485+09', '2025-08-12 16:41:31.716036+09', false),
(3, 'url', 'URL', 'url', true, true, true, true, NULL, NULL, NULL, NULL, 3, '2025-08-11 11:22:34.528485+09', '2025-08-12 16:41:31.716036+09', false),
(4, 'url_product_id', '상품ID', 'text', false, false, true, true, NULL, NULL, NULL, NULL, 21, '2025-08-12 14:31:17.489577+09', '2025-08-12 23:39:49.039186+09', true),
(5, 'url_item_id', '아이템ID', 'text', false, false, true, true, NULL, NULL, NULL, NULL, 22, '2025-08-12 14:31:17.489577+09', '2025-08-12 23:39:49.039186+09', true),
(6, 'url_vendor_item_id', '판매자아이템ID', 'text', false, false, true, true, NULL, NULL, NULL, NULL, 23, '2025-08-12 14:31:17.489577+09', '2025-08-12 23:39:49.039186+09', true);

-- 시퀀스 업데이트
SELECT setval('public.field_configs_id_seq', 6, true);

-- System Settings 삽입
INSERT INTO public.system_settings (key, value, category, description, updated_at, updated_by) VALUES
('chatEnabled', 'false', 'feature', '채팅 기능 활성화', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('chatMaxMessages', '100', 'feature', '채팅 최대 메시지 수', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('chatSoundEnabled', 'true', 'feature', '채팅 알림음', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('notificationEnabled', 'true', 'feature', '알림 활성화', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('slotEditMode', 'modal', 'feature', '슬롯 편집 모드', '2025-08-13 02:28:40.948073', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('slotPrice', '100', 'business', '슬롯 단가', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('supportEnabled', 'true', 'feature', '고객지원 활성화', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('field_url_vendor_item_id', 'true', 'field', '', '2025-08-12 14:45:59.949176', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('field_url_item_id', 'true', 'field', '', '2025-08-12 14:45:59.949176', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('field_mid', 'false', 'field', '', '2025-08-12 15:45:59.949176', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('field_url_product_id', 'true', 'field', '', '2025-08-12 14:45:59.949176', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('theme', 'modern', 'theme', '현재 테마', '2025-08-13 10:51:27.949177', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('themePrimaryColor', '#8B5CF6', 'theme', '메인 색상', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('darkMode', 'false', 'theme', '다크 모드', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('enableFieldParsing', 'true', 'field', 'URL 파싱 활성화', '2025-08-12 14:31:17.489577', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('emailNotification', 'false', 'feature', '이메일 알림', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maxSlotsPerUser', '1000', 'business', '사용자당 최대 슬롯 수', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('minCashCharge', '10000', 'business', '최소 충전 금액', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('cashChargeUnit', '10000', 'business', '충전 단위', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maxCashCharge', '1000000', 'business', '최대 충전 금액', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('companyName', '마케팅의정석', 'business', '회사명', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('siteTitle', '마케팅의정석 - 슬롯 관리 시스템', 'business', '사이트 제목', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('systemVersion', '1.0.0', 'business', '시스템 버전', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maintenanceMode', 'false', 'feature', '유지보수 모드', '2025-08-11 17:05:15.493634', '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3');

-- =============================================================================
-- 10. 완료 메시지
-- =============================================================================
-- 데이터베이스 초기 설정이 완료되었습니다.
-- admin@admin.com / password123 으로 로그인 가능합니다.