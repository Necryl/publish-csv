import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { inferSchema, parseCsv } from '$lib/server/csv';
import { getCurrentFile, uploadEncryptedCsv } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const current = await getCurrentFile();
	return { current };
};

export const actions: Actions = {
	upload: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('file');
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
			const stored = await uploadEncryptedCsv(file, parsed, schema);
			return { success: true, fileId: stored.id };
		} catch (error) {
			return fail(400, { error: (error as Error).message });
		}
	}
};
