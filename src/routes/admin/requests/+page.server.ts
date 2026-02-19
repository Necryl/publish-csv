import type { Actions, PageServerLoad } from './$types';
import { approveRequest, denyRequest, listRequests } from '$lib/server/db';
import { getRateLimitKey, rateLimit } from '$lib/server/rateLimit';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const requests = await listRequests();
	return { requests };
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
		await approveRequest(id);
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
		await denyRequest(id);
		return { success: true };
	}
};
