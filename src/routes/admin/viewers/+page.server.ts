import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	listApprovedRequests,
	listLinkDevices,
	revokeViewerDevice,
	listLinks
} from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const [devices, approved, links] = await Promise.all([
		listLinkDevices(),
		listApprovedRequests(),
		listLinks()
	]);

	const approvalById = new Map<string, (typeof approved)[number]>();
	for (const request of approved) {
		approvalById.set(request.id, request);
	}

	const viewers = devices.map((device) => {
		let approval: { type: 'request'; message: string | null } | { type: 'otp' } = { type: 'otp' };
		if (device.approved_request_id) {
			const matchedRequest = approvalById.get(device.approved_request_id);
			if (matchedRequest) {
				approval = { type: 'request', message: matchedRequest.message };
			}
		}
		return {
			id: device.id,
			linkId: device.link_id,
			linkName: device.access_links?.name ?? 'Untitled link',
			uaHash: device.ua_hash,
			createdAt: device.created_at,
			lastUsedAt: device.last_used_at,
			approval
		};
	});

	return { viewers, links };
};

export const actions: Actions = {
	revoke: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing viewer id' });
		await revokeViewerDevice(id);
		return { success: true };
	}
};
