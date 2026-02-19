import { supabase } from './supabase';

type AuditAction =
	| 'admin_login'
	| 'csv_uploaded'
	| 'link_created'
	| 'viewer_activated'
	| 'recovery_requested'
	| 'recovery_approved'
	| 'recovery_denied'
	| 'device_revoked';

export async function auditLog(
	action: AuditAction,
	details: Record<string, unknown>,
	sessionId?: string
): Promise<void> {
	const { error } = await supabase.from('audit_logs').insert({
		action,
		details,
		session_id: sessionId ?? null,
		created_at: new Date().toISOString()
	});

	if (error) {
		// Avoid throwing to keep main operation successful.
		// Intentionally ignore logging failures to prevent noisy output in production.
	}
}
