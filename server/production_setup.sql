--
-- Production Setup SQL for Simple Slot System
-- 운영서버 DB 완전 구성용 (스키마 + 데이터)
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

--
-- Functions
--

CREATE OR REPLACE FUNCTION public.get_next_seq_for_user(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM slots
  WHERE user_id = p_user_id;
  
  RETURN next_seq;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_allocation_used_slots() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 빈 슬롯이 채워질 때
        IF NEW.is_empty = FALSE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = used_slots + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 빈 슬롯이 채워질 때
        IF OLD.is_empty = TRUE AND NEW.is_empty = FALSE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = used_slots + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        -- 슬롯이 비워질 때 (삭제 등)
        ELSIF OLD.is_empty = FALSE AND NEW.is_empty = TRUE AND NEW.allocation_id IS NOT NULL THEN
            UPDATE user_slot_allocations 
            SET used_slots = GREATEST(0, used_slots - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.allocation_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

--
-- Tables
--

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(20)
);

-- System Settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    CONSTRAINT system_settings_category_check CHECK (((category)::text = ANY ((ARRAY['theme'::character varying, 'field'::character varying, 'business'::character varying, 'feature'::character varying])::text[])))
);

-- Field Configs table
CREATE TABLE IF NOT EXISTS public.field_configs (
    id integer NOT NULL,
    field_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    field_type character varying(20) NOT NULL,
    is_required boolean DEFAULT false,
    is_enabled boolean DEFAULT true,
    show_in_list boolean DEFAULT true,
    is_searchable boolean DEFAULT true,
    placeholder text,
    validation_rule text,
    options jsonb,
    default_value text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_system_generated boolean DEFAULT false,
    CONSTRAINT field_configs_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'url'::character varying, 'textarea'::character varying, 'select'::character varying, 'date'::character varying, 'email'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.field_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.field_configs_id_seq OWNED BY public.field_configs.id;

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_pinned boolean DEFAULT false,
    is_active boolean DEFAULT true,
    author_id character varying(255) NOT NULL,
    author_name character varying(255) NOT NULL,
    view_count integer DEFAULT 0,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    content_plain text,
    images jsonb DEFAULT '[]'::jsonb,
    content_type character varying(50) DEFAULT 'text'::character varying
);

-- Announcement reads table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Slots table
CREATE TABLE IF NOT EXISTS public.slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    seq integer NOT NULL,
    keyword character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    mid character varying(100),
    daily_budget numeric(10,2) DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    click_count integer DEFAULT 0,
    impression_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamp without time zone,
    approved_by uuid,
    rejection_reason text,
    approved_price numeric(10,2),
    form_data jsonb,
    issue_type character varying(20) DEFAULT 'normal'::character varying,
    is_empty boolean DEFAULT false,
    allocation_id uuid,
    slot_number integer,
    pre_allocation_start_date date,
    pre_allocation_end_date date,
    pre_allocation_work_count integer,
    pre_allocation_amount numeric(10,2),
    pre_allocation_description text,
    CONSTRAINT slots_issue_type_check CHECK (((issue_type)::text = ANY ((ARRAY['normal'::character varying, 'pre_issued'::character varying])::text[])))
);

-- Slot field values table
CREATE TABLE IF NOT EXISTS public.slot_field_values (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    slot_id uuid NOT NULL,
    field_key character varying(100) NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- User slot allocations table
CREATE TABLE IF NOT EXISTS public.user_slot_allocations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    allocated_slots integer DEFAULT 0 NOT NULL,
    used_slots integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    sender character varying(50) NOT NULL,
    recipient_id character varying(255) NOT NULL,
    auto_close boolean DEFAULT true,
    duration integer DEFAULT 5000,
    priority character varying(20) DEFAULT 'normal'::character varying,
    icon character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    metadata jsonb
);

-- Notification reads table
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Chat tables
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255),
    type character varying(50) DEFAULT 'support'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'text'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.chat_auto_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword character varying(255) NOT NULL,
    reply text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (legacy)
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    room_id uuid NOT NULL,
    sender_id character varying(255) NOT NULL,
    sender_name character varying(255) NOT NULL,
    sender_role character varying(50) NOT NULL,
    content text NOT NULL,
    status character varying(50) DEFAULT 'sent'::character varying NOT NULL,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.message_reads (
    message_id uuid NOT NULL,
    user_id character varying(255) NOT NULL,
    read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Pre-issued slots tables
CREATE TABLE IF NOT EXISTS public.pre_issued_slots (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    total_slots integer NOT NULL,
    used_slots integer DEFAULT 0,
    remaining_slots integer GENERATED ALWAYS AS ((total_slots - used_slots)) STORED,
    work_days integer NOT NULL,
    issued_by uuid NOT NULL,
    issued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pre_issued_slots_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.pre_issued_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pre_issued_slots_id_seq OWNED BY public.pre_issued_slots.id;

CREATE TABLE IF NOT EXISTS public.pre_issued_slot_usage (
    id integer NOT NULL,
    pre_issued_id integer NOT NULL,
    slot_id uuid,
    used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    form_data jsonb,
    status character varying(20) DEFAULT 'draft'::character varying,
    CONSTRAINT pre_issued_slot_usage_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);

CREATE SEQUENCE IF NOT EXISTS public.pre_issued_slot_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pre_issued_slot_usage_id_seq OWNED BY public.pre_issued_slot_usage.id;

--
-- Set default values for sequences
--

ALTER TABLE ONLY public.field_configs ALTER COLUMN id SET DEFAULT nextval('public.field_configs_id_seq'::regclass);
ALTER TABLE ONLY public.pre_issued_slots ALTER COLUMN id SET DEFAULT nextval('public.pre_issued_slots_id_seq'::regclass);
ALTER TABLE ONLY public.pre_issued_slot_usage ALTER COLUMN id SET DEFAULT nextval('public.pre_issued_slot_usage_id_seq'::regclass);

--
-- Primary Keys and Constraints
--

ALTER TABLE ONLY public.users ADD CONSTRAINT IF NOT EXISTS users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT IF NOT EXISTS users_email_key UNIQUE (email);

ALTER TABLE ONLY public.system_settings ADD CONSTRAINT IF NOT EXISTS system_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.field_configs ADD CONSTRAINT IF NOT EXISTS field_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.field_configs ADD CONSTRAINT IF NOT EXISTS field_configs_field_key_key UNIQUE (field_key);

ALTER TABLE ONLY public.announcements ADD CONSTRAINT IF NOT EXISTS announcements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.announcement_reads ADD CONSTRAINT IF NOT EXISTS announcement_reads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.announcement_reads ADD CONSTRAINT IF NOT EXISTS announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);

ALTER TABLE ONLY public.slots ADD CONSTRAINT IF NOT EXISTS slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.slots ADD CONSTRAINT IF NOT EXISTS slots_user_id_seq_key UNIQUE (user_id, seq);

ALTER TABLE ONLY public.slot_field_values ADD CONSTRAINT IF NOT EXISTS slot_field_values_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.slot_field_values ADD CONSTRAINT IF NOT EXISTS slot_field_values_slot_id_field_key_key UNIQUE (slot_id, field_key);

ALTER TABLE ONLY public.user_slot_allocations ADD CONSTRAINT IF NOT EXISTS user_slot_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_slot_allocations ADD CONSTRAINT IF NOT EXISTS user_slot_allocations_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.notifications ADD CONSTRAINT IF NOT EXISTS notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_reads ADD CONSTRAINT IF NOT EXISTS notification_reads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_reads ADD CONSTRAINT IF NOT EXISTS notification_reads_notification_id_user_id_key UNIQUE (notification_id, user_id);

ALTER TABLE ONLY public.chat_rooms ADD CONSTRAINT IF NOT EXISTS chat_rooms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT IF NOT EXISTS chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_participants ADD CONSTRAINT IF NOT EXISTS chat_participants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_participants ADD CONSTRAINT IF NOT EXISTS chat_participants_room_id_user_id_key UNIQUE (room_id, user_id);
ALTER TABLE ONLY public.chat_auto_replies ADD CONSTRAINT IF NOT EXISTS chat_auto_replies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.messages ADD CONSTRAINT IF NOT EXISTS messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.message_reads ADD CONSTRAINT IF NOT EXISTS message_reads_pkey PRIMARY KEY (message_id, user_id);

ALTER TABLE ONLY public.pre_issued_slots ADD CONSTRAINT IF NOT EXISTS pre_issued_slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pre_issued_slot_usage ADD CONSTRAINT IF NOT EXISTS pre_issued_slot_usage_pkey PRIMARY KEY (id);

--
-- Indexes
--

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings USING btree (category);
CREATE INDEX IF NOT EXISTS idx_field_configs_enabled ON public.field_configs USING btree (is_enabled);
CREATE INDEX IF NOT EXISTS idx_field_configs_order ON public.field_configs USING btree (display_order);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements USING btree (is_active, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements USING btree (category);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON public.slots USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.slots USING btree (status);
CREATE INDEX IF NOT EXISTS idx_slots_created_at ON public.slots USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slots_is_empty ON public.slots USING btree (is_empty);
CREATE INDEX IF NOT EXISTS idx_slots_allocation_id ON public.slots USING btree (allocation_id);
CREATE INDEX IF NOT EXISTS idx_slot_field_values_slot_id ON public.slot_field_values USING btree (slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_field_values_field_key ON public.slot_field_values USING btree (field_key);
CREATE INDEX IF NOT EXISTS idx_user_slot_allocations_user_id ON public.user_slot_allocations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

--
-- Triggers
--

DROP TRIGGER IF EXISTS update_allocation_trigger ON public.slots;
CREATE TRIGGER update_allocation_trigger AFTER INSERT OR UPDATE OF is_empty ON public.slots FOR EACH ROW EXECUTE FUNCTION public.update_allocation_used_slots();

DROP TRIGGER IF EXISTS update_field_configs_updated_at ON public.field_configs;
CREATE TRIGGER update_field_configs_updated_at BEFORE UPDATE ON public.field_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_pre_issued_slots_updated_at ON public.pre_issued_slots;
CREATE TRIGGER update_pre_issued_slots_updated_at BEFORE UPDATE ON public.pre_issued_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Foreign Key Constraints
--

ALTER TABLE ONLY public.system_settings ADD CONSTRAINT IF NOT EXISTS system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.announcement_reads ADD CONSTRAINT IF NOT EXISTS announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.slots ADD CONSTRAINT IF NOT EXISTS slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.slots ADD CONSTRAINT IF NOT EXISTS slots_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.slots ADD CONSTRAINT IF NOT EXISTS slots_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.user_slot_allocations(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.slot_field_values ADD CONSTRAINT IF NOT EXISTS slot_field_values_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.slot_field_values ADD CONSTRAINT IF NOT EXISTS slot_field_values_field_key_fkey FOREIGN KEY (field_key) REFERENCES public.field_configs(field_key) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_slot_allocations ADD CONSTRAINT IF NOT EXISTS user_slot_allocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_reads ADD CONSTRAINT IF NOT EXISTS notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_reads ADD CONSTRAINT IF NOT EXISTS notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.chat_rooms ADD CONSTRAINT IF NOT EXISTS chat_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT IF NOT EXISTS chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT IF NOT EXISTS chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.chat_participants ADD CONSTRAINT IF NOT EXISTS chat_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.chat_participants ADD CONSTRAINT IF NOT EXISTS chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.message_reads ADD CONSTRAINT IF NOT EXISTS message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pre_issued_slots ADD CONSTRAINT IF NOT EXISTS pre_issued_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pre_issued_slots ADD CONSTRAINT IF NOT EXISTS pre_issued_slots_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.pre_issued_slot_usage ADD CONSTRAINT IF NOT EXISTS pre_issued_slot_usage_pre_issued_id_fkey FOREIGN KEY (pre_issued_id) REFERENCES public.pre_issued_slots(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pre_issued_slot_usage ADD CONSTRAINT IF NOT EXISTS pre_issued_slot_usage_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE SET NULL;

--
-- Essential Data Inserts
--

-- 1. 관리자 계정
INSERT INTO public.users (id, email, password, full_name, role, is_active, created_at, updated_at) 
VALUES ('4c085f0c-be5d-43a8-8c37-7084ffe4a9c3', 'admin@admin.com', '$2b$10$ELjTRRtc/WJz.Uu3Uv3z1u4K2ZrKqWL/OQ30bdJpLElaftdw.HIyi', '시스템 관리자', 'operator', true, '2025-08-05 21:32:39.193894+09', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- 2. 시스템 설정
INSERT INTO public.system_settings (key, value, category, description, updated_at, updated_by) VALUES 
('globalTheme', '"modern"', 'theme', '시스템 전체 테마', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('globalLayout', '"classic"', 'theme', '시스템 전체 레이아웃', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('chatEnabled', 'false', 'feature', '채팅 기능 활성화', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('chatMaxMessages', '100', 'feature', '채팅 최대 메시지 수', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('chatSoundEnabled', 'true', 'feature', '채팅 알림음', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('notificationEnabled', 'true', 'feature', '알림 활성화', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('notificationSound', 'true', 'feature', '알림음', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('notificationDuration', '5000', 'feature', '알림 표시 시간(ms)', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('notificationAutoRead', 'false', 'feature', '알림 자동 읽음', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('featureSlotManagement', 'true', 'feature', '슬롯 관리 기능', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('featureRanking', 'false', 'feature', '랭킹 기능', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('featureCashHistory', 'false', 'feature', '캐시 내역 기능', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('useCashSystem', 'false', 'business', '캐시 시스템 사용 여부', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('slotOperationMode', '"pre-allocation"', 'business', '슬롯 운영 방식: normal(일반), pre-allocation(선슬롯발행)', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('defaultSlotPrice', '50000', 'business', '기본 슬롯 가격', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('defaultSlotAllocation', '10', 'business', '기본 할당 슬롯 수', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maxSlotsPerUser', '100', 'business', '사용자당 최대 슬롯 수', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('slotAutoApproval', 'false', 'business', '슬롯 자동 승인', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('cashAutoApproval', 'false', 'business', '캐시 충전 자동 승인', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('cashChargeMode', '"modal"', 'business', '캐시 충전 방식 (modal/page)', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('minCashCharge', '10000', 'business', '최소 충전 금액', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maxCashCharge', '1000000', 'business', '최대 충전 금액', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('registrationEnabled', 'false', 'business', '회원가입 허용', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3'),
('maintenanceMode', 'false', 'business', '유지보수 모드', CURRENT_TIMESTAMP, '4c085f0c-be5d-43a8-8c37-7084ffe4a9c3')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by;

-- 3. 필드 설정
INSERT INTO public.field_configs (field_key, label, field_type, is_required, is_enabled, show_in_list, is_searchable, display_order, is_system_generated) VALUES 
('keyword', '키워드', 'text', true, true, true, true, 1, false),
('url', 'URL', 'url', true, true, true, true, 3, false),
('url_product_id', '상품ID', 'text', false, false, true, true, 21, true),
('url_item_id', '아이템ID', 'text', false, false, true, true, 22, true),
('url_vendor_item_id', '판매자아이템ID', 'text', false, false, true, true, 23, true)
ON CONFLICT (field_key) DO UPDATE SET 
    label = EXCLUDED.label,
    field_type = EXCLUDED.field_type,
    is_required = EXCLUDED.is_required,
    is_enabled = EXCLUDED.is_enabled,
    show_in_list = EXCLUDED.show_in_list,
    is_searchable = EXCLUDED.is_searchable,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- 4. 채팅 자동 응답
INSERT INTO public.chat_auto_replies (keyword, reply, is_active) VALUES 
('안녕', '안녕하세요! 무엇을 도와드릴까요?', true),
('가격', '가격 문의는 광고 슬롯 페이지에서 확인하실 수 있습니다.', true),
('문의', '문의 주셔서 감사합니다. 운영자가 곧 답변 드리겠습니다.', true),
('결제', '결제 관련 문의는 내 정보 > 캐시 내역에서 확인하실 수 있습니다.', true),
('오류', '오류가 발생하셨군요. 구체적인 상황을 알려주시면 도움 드리겠습니다.', true)
ON CONFLICT DO NOTHING;

--
-- Complete!
--

SELECT 'Production setup completed successfully! 🎉' as message;