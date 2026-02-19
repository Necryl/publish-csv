import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	adminSessionCookieValue,
	createAdminSession,
	verifyAdminCredentials
} from '$lib/server/auth';
import { adminLoginSchema } from '$lib/server/schemas';
import { getRateLimitKey, rateLimit } from '$lib/server/rateLimit';
import { validateAdminPassword } from '$lib/server/validation';
import { dev } from '$app/environment';

export const load: PageServerLoad = async () => {
	return { error: null };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies } = event;
		const form = await request.formData();
		const parsed = adminLoginSchema.safeParse({
			email: form.get('email'),
			password: form.get('password')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}
		const { email, password } = parsed.data;
		const passwordError = validateAdminPassword(password);
		if (passwordError) {
			return fail(400, { error: passwordError });
		}
		const key = getRateLimitKey(event, 'admin_login');
		if (!rateLimit(key)) {
			return fail(429, { error: 'Too many login attempts. Try again later.' });
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
