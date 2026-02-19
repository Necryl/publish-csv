import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clearAdminSessions } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	throw redirect(303, '/admin');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		cookies.delete('admin_session', { path: '/' });
		await clearAdminSessions();
		throw redirect(303, '/admin/login');
	}
};
