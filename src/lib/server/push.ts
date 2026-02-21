import webpush from 'web-push';
import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { VAPID_PRIVATE_KEY } from '$env/static/private';
import { supabase } from './supabase';

webpush.setVapidDetails('mailto:admin@example.com', PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export type PushNotification = {
	title: string;
	body: string;
	data?: Record<string, string>;
};

/**
 * Send push notification to all subscriptions for a specific link (viewers)
 */
export async function notifyLinkSubscribers(
	linkId: string,
	notification: PushNotification
): Promise<void> {
	const { data: subscriptions, error } = await supabase
		.from('push_subscriptions')
		.select('endpoint, auth, p256dh, id')
		.eq('link_id', linkId)
		.eq('data_type', 'viewer');

	if (error) {
		console.error('Failed to fetch link subscriptions:', error);
		return;
	}

	if (!subscriptions || subscriptions.length === 0) {
		return;
	}

	const failedIds: string[] = [];

	for (const sub of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: {
						auth: sub.auth,
						p256dh: sub.p256dh
					}
				},
				JSON.stringify(notification)
			);
		} catch (error: any) {
			console.error(`Failed to send notification to subscriber ${sub.id}:`, error.message);
			// If subscription is invalid (410 Gone or 404), mark for deletion
			if (error.statusCode === 410 || error.statusCode === 404) {
				failedIds.push(sub.id);
			}
		}
	}

	// Clean up invalid subscriptions
	if (failedIds.length > 0) {
		await supabase.from('push_subscriptions').delete().in('id', failedIds);
	}
}

/**
 * Send push notification to all admin subscriptions
 */
export async function notifyAdmins(notification: PushNotification): Promise<void> {
	const { data: subscriptions, error } = await supabase
		.from('push_subscriptions')
		.select('endpoint, auth, p256dh, id')
		.eq('data_type', 'admin');

	if (error) {
		console.error('Failed to fetch admin subscriptions:', error);
		return;
	}

	if (!subscriptions || subscriptions.length === 0) {
		return;
	}

	const failedIds: string[] = [];

	for (const sub of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: {
						auth: sub.auth,
						p256dh: sub.p256dh
					}
				},
				JSON.stringify(notification)
			);
		} catch (error: any) {
			console.error(`Failed to send notification to admin ${sub.id}:`, error.message);
			if (error.statusCode === 410 || error.statusCode === 404) {
				failedIds.push(sub.id);
			}
		}
	}

	if (failedIds.length > 0) {
		await supabase.from('push_subscriptions').delete().in('id', failedIds);
	}
}

/**
 * Validate VAPID keys are available
 */
export function validatePushSetup(): boolean {
	return !!(PUBLIC_VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
