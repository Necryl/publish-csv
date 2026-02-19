-- Data retention cleanup policies for Supabase free tier
-- Automatically deletes old audit logs and resolved recovery requests

-- Create function to clean up old audit logs (older than 90 days)
create or replace function cleanup_old_audit_logs()
returns void as $$
begin
  delete from audit_logs
  where created_at < now() - interval '90 days';
end;
$$ language plpgsql;

-- Create function to clean up resolved recovery requests (older than 30 days)
create or replace function cleanup_old_recovery_requests()
returns void as $$
begin
  delete from recovery_requests
  where status in ('denied', 'approved')
    and resolved_at is not null
    and resolved_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Create combined cleanup function
create or replace function cleanup_data_retention()
returns json as $$
declare
  audit_deleted int;
  requests_deleted int;
begin
  -- Clean up audit logs
  delete from audit_logs
  where created_at < now() - interval '90 days';
  get diagnostics audit_deleted = row_count;

  -- Clean up resolved recovery requests
  delete from recovery_requests
  where status in ('denied', 'approved')
    and resolved_at is not null
    and resolved_at < now() - interval '30 days';
  get diagnostics requests_deleted = row_count;

  return json_build_object(
    'audit_logs_deleted', audit_deleted,
    'recovery_requests_deleted', requests_deleted,
    'cleaned_at', now()
  );
end;
$$ language plpgsql;

-- Grant execute permissions if needed
grant execute on function cleanup_old_audit_logs to authenticated;
grant execute on function cleanup_old_recovery_requests to authenticated;
grant execute on function cleanup_data_retention to authenticated;
