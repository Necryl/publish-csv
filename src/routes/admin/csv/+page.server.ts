import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { inferSchema, parseCsv, validateCsvSize } from '$lib/server/csv';
import {
	getCurrentFile,
	uploadEncryptedCsv,
	updateFileMessage,
	getAllFiles,
	deleteFile,
	setCurrentFile,
	listLinks
} from '$lib/server/db';
import { mapActionError } from '$lib/server/error-mapper';
import { logError } from '$lib/server/logger';
import { notifyLinkSubscribers } from '$lib/server/push';

const MAX_UPDATE_MESSAGE_LENGTH = 500;

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
		const sizeError = validateCsvSize(file);
		if (sizeError) {
			return fail(400, { error: sizeError });
		}
		try {
			const text = await file.text();
			const parsed = parseCsv(text);
			if (!parsed.headers.length) {
				return fail(400, { error: 'CSV must include headers' });
			}
			const schema = inferSchema(parsed.rows, parsed.headers);
			const messageValue = typeof updateMessage === 'string' ? updateMessage.trim() : null;
			if (messageValue && messageValue.length > MAX_UPDATE_MESSAGE_LENGTH) {
				return fail(400, { error: 'Update message is too long' });
			}
			const stored = await uploadEncryptedCsv(file, parsed, schema, messageValue);
			return { success: true, fileId: stored.id };
		} catch (error) {
			logError('csv_upload_failed', { error });
			return fail(400, { error: mapActionError(error, 'Unable to upload CSV') });
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
			if (messageValue && messageValue.length > MAX_UPDATE_MESSAGE_LENGTH) {
				return fail(400, { error: 'Update message is too long' });
			}
			await updateFileMessage(fileId, messageValue);
			// Notify viewers of links using this file
			const links = await listLinks();
			for (const link of links) {
				if (link.file_id === fileId) {
					const body = messageValue
						? `${link.name} updated: ${messageValue}`
						: `${link.name} updated`;
					await notifyLinkSubscribers(link.id, {
						title: 'Update Available',
						body,
						data: { url: `/v/${link.id}` }
					});
				}
			}
			return { success: true };
		} catch (error) {
			logError('csv_update_message_failed', { error, fileId });
			return fail(400, { error: mapActionError(error, 'Unable to update message') });
		}
	},
	setActive: async ({ request }) => {
		const form = await request.formData();
		const fileId = form.get('fileId');
		if (typeof fileId !== 'string') {
			return fail(400, { error: 'Missing or invalid file ID' });
		}
		try {
			await setCurrentFile(fileId);
			// Notify viewers that data has been updated
			const files = await getAllFiles();
			const activeFile = files.find((f) => f.id === fileId);
			const links = await listLinks();
			for (const link of links) {
				if (link.file_id === fileId) {
					const body = activeFile?.update_message
						? `${link.name} updated: ${activeFile.update_message}`
						: `${link.name} updated`;
					await notifyLinkSubscribers(link.id, {
						title: 'Data Updated',
						body,
						data: { url: `/v/${link.id}` }
					});
				}
			}
			return { success: true };
		} catch (error) {
			logError('csv_set_active_failed', { error, fileId });
			return fail(400, { error: mapActionError(error, 'Unable to set active file') });
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
			logError('csv_delete_failed', { error, fileId });
			return fail(400, { error: mapActionError(error, 'Unable to delete file') });
		}
	}
};
