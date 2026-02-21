-- Track push subscriptions for OS-level notifications
create table if not exists push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	-- For admins: admin session or null for viewers
	data_type text not null default 'viewer', -- 'admin' or 'viewer'
	-- For viewers: which link they subscribed for
	link_id uuid references access_links(id) on delete cascade,
	-- For admins: which admin session
	session_id text references admin_sessions(session_id) on delete cascade,
	-- Push subscription endpoint
	endpoint text not null unique,
	-- Encryption keys
	auth text not null,
	p256dh text not null,
	-- Metadata
	created_at timestamptz not null default now(),
	last_active_at timestamptz
);

create index if not exists push_subscriptions_link_id on push_subscriptions(link_id);
create index if not exists push_subscriptions_session_id on push_subscriptions(session_id);
create index if not exists push_subscriptions_data_type on push_subscriptions(data_type);
