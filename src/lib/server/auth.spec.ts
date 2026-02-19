import { describe, expect, it, vi } from 'vitest';

const envValues = vi.hoisted(() => ({
	ADMIN_EMAIL: 'admin@example.com',
	ADMIN_PASSWORD: 'StrongPass123',
	COOKIE_SECRET: 'cookie-secret',
	ENCRYPTION_MASTER_KEY: Buffer.from('secret'.repeat(8)).toString('base64')
}));

vi.mock('./env', () => ({
	requireEnv: (key: string) => envValues[key]
}));

const adminSessionState = vi.hoisted(() => ({
	record: null as { session_id: string; ua_hash: string; expires_at: string } | null
}));

const supabaseMocks = vi.hoisted(() => ({
	deleteMock: vi.fn(() => ({ neq: vi.fn(() => ({ error: null })) })),
	insertMock: vi.fn(() => ({ error: null })),
	selectMock: vi.fn(() => ({
		eq: vi.fn(() => ({
			maybeSingle: vi.fn(() => ({ data: adminSessionState.record, error: null }))
		}))
	}))
}));

vi.mock('./supabase', () => ({
	supabase: {
		from: vi.fn(() => ({
			delete: supabaseMocks.deleteMock,
			insert: supabaseMocks.insertMock,
			select: supabaseMocks.selectMock
		}))
	}
}));

import {
	adminSessionCookieValue,
	createAdminSession,
	validateAdminSession,
	verifyAdminCredentials
} from './auth';

describe('auth helpers', () => {
	it('verifies admin credentials', async () => {
		await expect(verifyAdminCredentials('admin@example.com', 'StrongPass123')).resolves.toBe(true);
		await expect(verifyAdminCredentials('admin@example.com', 'WrongPass123')).resolves.toBe(false);
		await expect(verifyAdminCredentials('other@example.com', 'StrongPass123')).resolves.toBe(false);
	});

	it('creates and validates an admin session', async () => {
		const session = await createAdminSession('unit-test-agent');
		adminSessionState.record = {
			session_id: session.sessionId,
			ua_hash: session.userAgentHash,
			expires_at: session.expiresAt
		};

		const cookieValue = adminSessionCookieValue(session.sessionId);
		const ok = await validateAdminSession(cookieValue, 'unit-test-agent');
		expect(ok).toBe(true);
	});

	it('rejects expired admin sessions', async () => {
		adminSessionState.record = {
			session_id: 'expired-session',
			ua_hash: 'ua-hash',
			expires_at: new Date(Date.now() - 1000).toISOString()
		};
		const ok = await validateAdminSession('expired-session', 'unit-test-agent');
		expect(ok).toBe(false);
	});
});
