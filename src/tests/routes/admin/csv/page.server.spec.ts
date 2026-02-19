import { describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
	uploadEncryptedCsv: vi.fn(),
	updateFileMessage: vi.fn(),
	getAllFiles: vi.fn(),
	getCurrentFile: vi.fn(),
	deleteFile: vi.fn(),
	setCurrentFile: vi.fn()
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

import { actions } from '../../../../routes/admin/csv/+page.server';

const makeUploadEvent = (file?: File, updateMessage?: string) => {
	const form = new FormData();
	if (file) {
		form.set('file', file);
	}
	if (updateMessage !== undefined) {
		form.set('updateMessage', updateMessage);
	}
	return {
		request: new Request('http://localhost/admin/csv', { method: 'POST', body: form })
	};
};

describe('admin csv upload action', () => {
	it('requires a CSV file', async () => {
		const result = await actions.upload(makeUploadEvent() as never);
		expect(result?.status).toBe(400);
		expect(result?.data?.error).toBe('Missing file');
	});

	it('uploads a CSV and returns file id', async () => {
		dbMocks.uploadEncryptedCsv.mockResolvedValue({ id: 'file-1' });
		const csvFile = new File(['name,age\nAlice,30\n'], 'data.csv', { type: 'text/csv' });
		const result = await actions.upload(makeUploadEvent(csvFile, 'Update info') as never);
		expect(result?.success).toBe(true);
		expect(result?.fileId).toBe('file-1');
		expect(dbMocks.uploadEncryptedCsv).toHaveBeenCalled();
	});
});
