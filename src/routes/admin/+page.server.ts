import type { PageServerLoad } from './$types';
import { getCurrentFile, listLinks, listRequests } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const [current, links, requests] = await Promise.all([
		getCurrentFile(),
		listLinks(),
		listRequests()
	]);
	const pending = requests.filter((request) => request.status === 'pending').length;
	return {
		current,
		linkCount: links.length,
		pendingRequests: pending
	};
};
