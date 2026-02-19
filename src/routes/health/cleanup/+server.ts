import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/supabase';

/**
 * Admin-only cleanup endpoint
 * Runs data retention policies to keep Supabase free tier usage under control
 * Can be triggered by external cron service (e.g., EasyCron, cron-job.org)
 *
 * Usage: POST /health/cleanup?secret=YOUR_SECRET
 */
export const POST: RequestHandler = async ({ url }) => {
	const secret = url.searchParams.get('secret');
	const cleanupSecret = process.env.CLEANUP_SECRET;

	// Verify secret authorization
	if (!cleanupSecret || secret !== cleanupSecret) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Call the cleanup function
		const { data, error } = await supabase.rpc('cleanup_data_retention');

		if (error) {
			return json(
				{
					error: 'Cleanup failed',
					details: error.message
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: 'Data retention cleanup completed',
			details: data
		});
	} catch (err) {
		return json(
			{
				error: 'Unexpected error during cleanup',
				details: err instanceof Error ? err.message : String(err)
			},
			{ status: 500 }
		);
	}
};
