import { describe, expect, it, vi } from 'vitest';

const cryptoMocks = vi.hoisted(() => ({
	generateToken: vi.fn(() => 'token'),
	hashToken: vi.fn(() => 'token-hash'),
	scryptHash: vi.fn(() => 'hash'),
	scryptVerify: vi.fn(() => true)
}));

vi.mock('./crypto', () => cryptoMocks);

vi.mock('./auditLog', () => ({
	auditLog: vi.fn()
}));

const dbState = vi.hoisted(() => ({
	updateResult: { id: 'link-1' } as { id: string } | null
}));

const supabaseMocks = vi.hoisted(() => ({
	insertMock: vi.fn(() => ({
		select: vi.fn(() => ({
			single: vi.fn(() => ({ data: { id: 'device-1' }, error: null }))
		}))
	})),
	deleteMock: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
	updateMock: vi.fn(() => ({
		eq: vi.fn(() => ({
			is: vi.fn(() => ({
				select: vi.fn(() => ({
					maybeSingle: vi.fn(() => ({ data: dbState.updateResult, error: null }))
				}))
			}))
		}))
	}))
}));

vi.mock('./supabase', () => ({
	supabase: {
		from: vi.fn((table: string) => {
			if (table === 'link_devices') {
				return {
					insert: supabaseMocks.insertMock,
					delete: supabaseMocks.deleteMock
				};
			}
			if (table === 'access_links') {
				return { update: supabaseMocks.updateMock };
			}
			return {};
		})
	}
}));

import { activateDevice } from './db';

describe('db helpers', () => {
	it('activates a device and marks password used', async () => {
		dbState.updateResult = { id: 'link-1' };
		const token = await activateDevice('link-1', 'device-hash', true);
		expect(token).toBe('token');
		expect(supabaseMocks.insertMock).toHaveBeenCalled();
		expect(supabaseMocks.updateMock).toHaveBeenCalled();
	});

	it('rolls back when password already used', async () => {
		dbState.updateResult = null;
		await expect(activateDevice('link-1', 'device-hash', true)).rejects.toThrow(
			'Password already used'
		);
		expect(supabaseMocks.deleteMock).toHaveBeenCalled();
	});
});
