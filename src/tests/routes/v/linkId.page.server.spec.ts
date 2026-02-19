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

import { actions } from '../../../routes/v/[linkId]/+page.server';

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
	it('returns a friendly error when OTP is already used', async () => {
		dbMocks.verifyLinkPassword.mockResolvedValue({ valid: true, alreadyUsed: false });
		dbMocks.activateDevice.mockRejectedValue(new Error('Password already used'));

		const result = await actions.login(makeEvent({ password: 'secret' }) as never);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toContain('already been used');
	});

	it('submits a recovery request and sets a cookie', async () => {
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
