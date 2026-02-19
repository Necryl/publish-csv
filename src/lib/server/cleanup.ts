import { supabase } from './supabase';
import { logError } from './logger';

let cleanupScheduled = false;

/**
 * Starts automatic data retention cleanup
 * Runs daily to keep Supabase free tier usage under control
 */
export function startCleanupScheduler(): void {
	if (cleanupScheduled) return;
	cleanupScheduled = true;

	// Run cleanup immediately on startup
	runCleanup();

	// Then run every 24 hours
	setInterval(runCleanup, 24 * 60 * 60 * 1000);
}

async function runCleanup(): Promise<void> {
	try {
		const { data, error } = await supabase.rpc('cleanup_data_retention');

		if (error) {
			logError('cleanup_failed', { error: error.message });
			return;
		}

		if (data) {
			console.log(
				`[Cleanup] Deleted ${data.audit_logs_deleted} audit logs, ${data.recovery_requests_deleted} recovery requests`
			);
		}
	} catch (err) {
		logError('cleanup_error', { error: err instanceof Error ? err.message : String(err) });
	}
}
