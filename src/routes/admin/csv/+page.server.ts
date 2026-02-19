import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { inferSchema, parseCsv } from '$lib/server/csv';
import {
	getCurrentFile,
	uploadEncryptedCsv,
	updateFileMessage,
	getAllFiles,
	deleteFile,
	setCurrentFile
} from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const current = await getCurrentFile();
	const allFiles = await getAllFiles();
	return { current, allFiles };
};

export const actions: Actions = {
	upload: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('file');
		const updateMessage = form.get('updateMessage');
		if (!(file instanceof File)) {
			return fail(400, { error: 'Missing file' });
		}
		try {
			const text = await file.text();
			const parsed = parseCsv(text);
			if (!parsed.headers.length) {
				return fail(400, { error: 'CSV must include headers' });
			}
			const schema = inferSchema(parsed.rows, parsed.headers);
			const messageValue = typeof updateMessage === 'string' ? updateMessage.trim() : null;
			const stored = await uploadEncryptedCsv(file, parsed, schema, messageValue);
			return { success: true, fileId: stored.id };
		} catch (error) {
			return fail(400, { error: (error as Error).message });
		}
	},
	updateMessage: async ({ request }) => {
		const form = await request.formData();
		const fileId = form.get('fileId');
		const message = form.get('message');
		if (typeof fileId !== 'string') {
			return fail(400, { error: 'Missing file ID' });
		}
		try {
			const messageValue = typeof message === 'string' ? message.trim() : null;
			await updateFileMessage(fileId, messageValue);
			return { success: true };
		} catch (error) {
			return fail(400, { error: (error as Error).message });
		}
	},
	setActive: async ({ request }) => {
		const form = await request.formData();
		const fileId = form.get('fileId');
		console.log('setActive form data:', {
			allKeys: Array.from(form.keys()),
			fileId,
			fileIdType: typeof fileId
		});
		if (typeof fileId !== 'string') {
			console.error('Invalid fileId, returning 400');
			return fail(400, { error: 'Missing or invalid file ID' });
		}
		try {
			console.log('Setting file as active:', fileId);
			await setCurrentFile(fileId);
			console.log('File activated and links updated');
			return { success: true };
		} catch (error) {
			console.error('Error setting active file:', error);
			return fail(400, { error: (error as Error).message });
		}
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const fileId = form.get('fileId');
		if (typeof fileId !== 'string') {
			return fail(400, { error: 'Missing file ID' });
		}
		try {
			await deleteFile(fileId);
			return { success: true };
		} catch (error) {
			return fail(400, { error: (error as Error).message });
		}
	}
};
