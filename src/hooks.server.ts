import type { Handle } from '@sveltejs/kit';
import { startCleanupScheduler } from '$lib/server/cleanup';

let cleanupStarted = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize cleanup scheduler on first request
	if (!cleanupStarted) {
		cleanupStarted = true;
		startCleanupScheduler();
	}

	return resolve(event);
};
