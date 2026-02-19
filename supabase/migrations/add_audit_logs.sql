-- Add audit_logs table for security event tracking
create table if not exists audit_logs (
	id uuid primary key default gen_random_uuid(),
	action text not null,
	details jsonb,
	session_id text,
	created_at timestamptz not null default now()
);

create index if not exists audit_logs_action_created
	on audit_logs (action, created_at);

create index if not exists audit_logs_session
	on audit_logs (session_id);
