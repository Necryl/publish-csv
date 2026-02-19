import { describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
	createAccessLink: vi.fn(),
	deleteLink: vi.fn(),
	getCurrentFile: vi.fn(),
	listLinks: vi.fn(),
	toggleLink: vi.fn(),
	updateLinkLabel: vi.fn(),
	updateLinkOptions: vi.fn()
}));

vi.mock('$lib/server/db', () => dbMocks);

const errorMapperMocks = vi.hoisted(() => ({
	mapActionError: vi.fn((_error: unknown, fallback: string) => fallback)
}));

vi.mock('$lib/server/error-mapper', () => errorMapperMocks);

const loggerMocks = vi.hoisted(() => ({
	logError: vi.fn()
}));

vi.mock('$lib/server/logger', () => loggerMocks);

import { actions } from '../../../../routes/admin/links/+page.server';

const makeCreateEvent = (fields: Record<string, string>) => {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		form.set(key, value);
	}
	return { request: new Request('http://localhost/admin/links', { method: 'POST', body: form }) };
};

describe('admin links create action', () => {
	it('rejects link creation when CSV schema is missing', async () => {
		dbMocks.getCurrentFile.mockResolvedValue({ schema: { columns: [] } });
		const result = await actions.create(
			makeCreateEvent({
				name: 'Link 1',
				password: 'secret1',
				criteria: '[]'
			}) as never
		);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toBe('CSV schema is missing or empty');
	});

	it('sanitizes criteria to known columns', async () => {
		dbMocks.getCurrentFile.mockResolvedValue({
			schema: { columns: [{ name: 'name' }, { name: 'age' }] }
		});
		dbMocks.createAccessLink.mockResolvedValue({ id: 'link-1' });

		const result = await actions.create(
			makeCreateEvent({
				name: 'Link 1',
				password: 'secret1',
				criteria: JSON.stringify([
					{ column: 'name', op: 'eq', value: 'Alice' },
					{ column: 'missing', op: 'eq', value: 'X' }
				])
			}) as never
		);

		expect(result?.success).toBe(true);
		expect(dbMocks.createAccessLink).toHaveBeenCalledWith(
			expect.objectContaining({
				criteria: [{ column: 'name', op: 'eq', value: 'Alice' }]
			})
		);
	});
});
