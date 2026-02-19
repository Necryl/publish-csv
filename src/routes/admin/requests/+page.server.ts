import type { Actions, PageServerLoad } from './$types';
import { approveRequest, denyRequest, listRequests } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const requests = await listRequests();
	return { requests };
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing request id' });
		await approveRequest(id);
		return { success: true };
	},
	deny: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing request id' });
		await denyRequest(id);
		return { success: true };
	}
};
