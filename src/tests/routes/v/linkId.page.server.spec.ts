import { describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
	activateDevice: vi.fn(),
	checkApprovedRequest: vi.fn(),
	fetchCsvRows: vi.fn(),
	getLinkWithFile: vi.fn(),
	submitRecoveryRequest: vi.fn(),
	validateDevice: vi.fn(),
	verifyLinkPassword: vi.fn(),
	getCurrentFile: vi.fn()
}));

vi.mock('$lib/server/db', () => dbMocks);

const cryptoMocks = vi.hoisted(() => ({
	hashDeviceFingerprint: vi.fn(() => 'device-hash'),
	signCookieValue: vi.fn((value: string) => `signed.${value}`),
	verifySignedCookie: vi.fn(() => null)
}));

vi.mock('$lib/server/crypto', () => cryptoMocks);

const rateLimitMocks = vi.hoisted(() => ({
	getRateLimitKey: vi.fn(() => 'viewer-login'),
	rateLimit: vi.fn(() => true)
}));

vi.mock('$lib/server/rateLimit', () => rateLimitMocks);

const authMocks = vi.hoisted(() => ({
	validateAdminSession: vi.fn(() => Promise.resolve(false))
}));

vi.mock('$lib/server/auth', () => authMocks);

import { actions, load } from '../../../routes/v/[linkId]/+page.server';

const makeEvent = (fields: Record<string, string>) => {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		form.set(key, value);
	}
	return {
		params: { linkId: 'link-1' },
		request: new Request('http://localhost/v/link-1', { method: 'POST', body: form }),
		cookies: { set: vi.fn() },
		getClientAddress: () => '127.0.0.1'
	};
};

describe('viewer actions', () => {
	it('allows admin to bypass link password', async () => {
		authMocks.validateAdminSession.mockResolvedValue(true);
		dbMocks.getLinkWithFile.mockResolvedValue({
			id: 'link-1',
			name: 'Test Link',
			active: true,
			criteria: []
		});
		dbMocks.getCurrentFile.mockResolvedValue({
			schema: { columns: [{ name: 'col1' }] }
		});
		dbMocks.fetchCsvRows.mockResolvedValue([{ col1: 'data' }]);

		const event = {
			params: { linkId: 'link-1' },
			request: new Request('http://localhost/v/link-1'),
			cookies: { get: vi.fn(() => 'admin-session-cookie'), set: vi.fn(), delete: vi.fn() },
			getClientAddress: () => '127.0.0.1'
		};

		const result = (await load(event as never)) as { status: string };
		expect(result.status).toBe('ok');
		expect(authMocks.validateAdminSession).toHaveBeenCalledWith(
			'admin-session-cookie',
			expect.any(String)
		);
	});

	it('returns a friendly error when OTP is already used', async () => {
		authMocks.validateAdminSession.mockResolvedValue(false);
		dbMocks.verifyLinkPassword.mockResolvedValue({ valid: true, alreadyUsed: false });
		dbMocks.activateDevice.mockRejectedValue(new Error('Password already used'));

		const result = await actions.login(makeEvent({ password: 'secret' }) as never);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toContain('already been used');
	});

	it('submits a recovery request and sets a cookie', async () => {
		authMocks.validateAdminSession.mockResolvedValue(false);
		dbMocks.submitRecoveryRequest.mockResolvedValue('request-1');

		const event = makeEvent({ message: 'Please approve.' });
		const result = await actions.request(event as never);
		expect(result?.requested).toBe(true);
		expect(event.cookies.set).toHaveBeenCalledWith(
			'request_link-1',
			'signed.request-1',
			expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'strict' })
		);
	});
});
