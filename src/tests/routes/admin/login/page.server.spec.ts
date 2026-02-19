import { describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
	verifyAdminCredentials: vi.fn(),
	createAdminSession: vi.fn(),
	adminSessionCookieValue: vi.fn()
}));

vi.mock('$lib/server/auth', () => authMocks);

const rateLimitMocks = vi.hoisted(() => ({
	getRateLimitKey: vi.fn(() => 'admin-login'),
	rateLimit: vi.fn(() => true)
}));

vi.mock('$lib/server/rateLimit', () => rateLimitMocks);

import { actions } from '../../../../routes/admin/login/+page.server';

const makeEvent = (fields: Record<string, string>) => {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		form.set(key, value);
	}
	return {
		request: new Request('http://localhost/admin/login', { method: 'POST', body: form }),
		cookies: { set: vi.fn() },
		getClientAddress: () => '127.0.0.1'
	};
};

describe('admin login action', () => {
	it('sets session cookie and redirects on success', async () => {
		authMocks.verifyAdminCredentials.mockResolvedValue(true);
		authMocks.createAdminSession.mockResolvedValue({
			sessionId: 'session-1',
			userAgentHash: 'ua-hash',
			expiresAt: new Date().toISOString()
		});
		authMocks.adminSessionCookieValue.mockReturnValue('signed-session');

		const event = makeEvent({ email: 'admin@example.com', password: 'StrongPass123' });
		try {
			await actions.default(event as never);
			expect.unreachable('Expected redirect to be thrown');
		} catch (error) {
			const redirect = error as { status?: number; location?: string };
			expect(redirect.status).toBe(303);
			expect(redirect.location).toBe('/admin');
		}

		expect(event.cookies.set).toHaveBeenCalledWith(
			'admin_session',
			'signed-session',
			expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'strict' })
		);
	});

	it('rejects invalid credentials', async () => {
		authMocks.verifyAdminCredentials.mockResolvedValue(false);
		const event = makeEvent({ email: 'admin@example.com', password: 'StrongPass123' });
		const result = await actions.default(event as never);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toBe('Invalid credentials');
	});
});
