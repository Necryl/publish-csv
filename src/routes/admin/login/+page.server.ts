import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	adminSessionCookieValue,
	createAdminSession,
	verifyAdminCredentials
} from '$lib/server/auth';
import { dev } from '$app/environment';

export const load: PageServerLoad = async () => {
	return { error: null };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Missing credentials' });
		}

		const ok = await verifyAdminCredentials(email, password);
		if (!ok) {
			return fail(400, { error: 'Invalid credentials' });
		}

		const session = await createAdminSession(request.headers.get('user-agent') ?? '');
		cookies.set('admin_session', adminSessionCookieValue(session.sessionId), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: 60 * 60 * 8
		});

		throw redirect(303, '/admin');
	}
};
