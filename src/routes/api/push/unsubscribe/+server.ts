import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unsubscribeFromPushNotifications } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { endpoint } = body;

	if (!endpoint) {
		return json({ error: 'Missing endpoint' }, { status: 400 });
	}

	try {
		await unsubscribeFromPushNotifications(endpoint);
		return json({ success: true });
	} catch (error: any) {
		console.error('Unsubscription error:', error);
		return json({ error: error.message || 'Failed to unsubscribe' }, { status: 500 });
	}
};
