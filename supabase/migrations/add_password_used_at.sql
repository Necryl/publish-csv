-- Add password_used_at column to track one-time password usage
alter table access_links add column if not exists password_used_at timestamptz;
