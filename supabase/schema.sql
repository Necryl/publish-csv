-- Database schema for encrypted CSV link sharing
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists app_settings (
	key text primary key,
	value jsonb not null,
	updated_at timestamptz not null default now()
);

create table if not exists csv_files (
	id uuid primary key default gen_random_uuid(),
	filename text not null,
	storage_path text not null,
	uploaded_at timestamptz not null default now(),
	schema jsonb not null,
	row_count integer not null,
	enc_salt text not null,
	enc_iv text not null,
	enc_tag text not null
);

create table if not exists access_links (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	file_id uuid references csv_files(id) on delete restrict,
	criteria jsonb not null,
	active boolean not null default true,
	password_salt text not null,
	password_hash text not null,
	created_at timestamptz not null default now()
);

create table if not exists link_devices (
	id uuid primary key default gen_random_uuid(),
	link_id uuid references access_links(id) on delete cascade,
	token_hash text not null,
	ua_hash text not null,
	created_at timestamptz not null default now(),
	last_used_at timestamptz
);

create unique index if not exists link_devices_unique_token
	on link_devices (link_id, token_hash);

create table if not exists recovery_requests (
	id uuid primary key default gen_random_uuid(),
	link_id uuid references access_links(id) on delete cascade,
	ua_hash text not null,
	message text,
	status text not null default 'pending',
	created_at timestamptz not null default now(),
	resolved_at timestamptz
);

create index if not exists recovery_requests_status
	on recovery_requests (status);

create table if not exists admin_sessions (
	id uuid primary key default gen_random_uuid(),
	session_id text not null,
	ua_hash text not null,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null
);

create unique index if not exists admin_sessions_session_id
	on admin_sessions (session_id);
