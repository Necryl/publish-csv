import type { Actions, PageServerLoad } from './$types';
import { approveRequest, denyRequest, listRequests, listLinks } from '$lib/server/db';
import { getRateLimitKey, rateLimit } from '$lib/server/rateLimit';
import { notifyAdmins, notifyLinkSubscribers } from '$lib/server/push';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const [requests, links] = await Promise.all([listRequests(), listLinks()]);
	const linkNameById = new Map(links.map((link) => [link.id, link.name]));
	const requestsWithLinkNames = requests.map((req) => ({
		...req,
		linkName: linkNameById.get(req.link_id) ?? 'Untitled link'
	}));
	return { requests: requestsWithLinkNames, links };
};

export const actions: Actions = {
	approve: async (event) => {
		const { request } = event;
		const key = getRateLimitKey(event, 'admin_approve');
		if (!rateLimit(key)) {
			return fail(429, { error: 'Too many requests. Try again later.' });
		}
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing request id' });
		const linkId = await approveRequest(id);
		// Notify the viewer their request was approved
		if (linkId) {
			await notifyLinkSubscribers(linkId, {
				title: 'Request Approved',
				body: 'Your recovery request has been approved. You can now access the link.',
				data: { url: `/v/${linkId}` }
			});
		}
		return { success: true };
	},
	deny: async (event) => {
		const { request } = event;
		const key = getRateLimitKey(event, 'admin_deny');
		if (!rateLimit(key)) {
			return fail(429, { error: 'Too many requests. Try again later.' });
		}
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing request id' });
		const linkId = await denyRequest(id);
		// Notify the viewer their request was denied
		if (linkId) {
			await notifyLinkSubscribers(linkId, {
				title: 'Request Denied',
				body: 'Your recovery request has been denied. Please contact the admin for more information.',
				data: { url: `/v/${linkId}` }
			});
		}
		return { success: true };
	}
};
