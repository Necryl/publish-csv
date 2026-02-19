import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { validateAdminSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
	if (url.pathname.startsWith('/admin/login') || url.pathname.startsWith('/admin/logout')) {
		return {};
	}
	const ok = await validateAdminSession(
		cookies.get('admin_session'),
		request.headers.get('user-agent') ?? ''
	);
	if (!ok) {
		throw redirect(303, '/admin/login');
	}
	return {};
};
