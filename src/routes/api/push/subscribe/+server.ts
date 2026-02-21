import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	subscribeAdminToPushNotifications,
	subscribeViewerToPushNotifications
} from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const adminCookie = cookies.get('admin_session');
	const body = await request.json();
	const { subscription, type } = body;

	if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
		return json({ error: 'Invalid subscription' }, { status: 400 });
	}

	try {
		if (type === 'admin') {
			if (!adminCookie) {
				return json({ error: 'Not authenticated as admin' }, { status: 401 });
			}
			await subscribeAdminToPushNotifications(adminCookie, {
				endpoint: subscription.endpoint,
				auth: subscription.keys.auth,
				p256dh: subscription.keys.p256dh
			});
		} else if (type === 'viewer') {
			const { linkId } = body;
			if (!linkId) {
				return json({ error: 'Missing linkId for viewer subscription' }, { status: 400 });
			}
			await subscribeViewerToPushNotifications(linkId, {
				endpoint: subscription.endpoint,
				auth: subscription.keys.auth,
				p256dh: subscription.keys.p256dh
			});
		} else {
			return json({ error: 'Invalid subscription type' }, { status: 400 });
		}

		return json({ success: true });
	} catch (error: any) {
		console.error('Subscription error:', error);
		console.error('Full error details:', JSON.stringify(error, null, 2));
		return json(
			{ error: error.message || 'Failed to subscribe', details: error.code },
			{ status: 500 }
		);
	}
};
