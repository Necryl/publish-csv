import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createAccessLink,
	deleteLink,
	getCurrentFile,
	listLinks,
	toggleLink,
	updateLinkLabel,
	updateLinkOptions
} from '$lib/server/db';
import type { CsvCriteria } from '$lib/server/csv';
import { createLinkSchema } from '$lib/server/schemas';
import { validateLinkPassword } from '$lib/server/validation';
import { mapActionError } from '$lib/server/error-mapper';
import { logError } from '$lib/server/logger';

export const load: PageServerLoad = async ({ url }) => {
	const [links, current] = await Promise.all([listLinks(), getCurrentFile()]);
	return {
		links,
		current,
		baseUrl: `${url.origin}/v/`
	};
};

function sanitizeCriteria(raw: string, columns: string[]): CsvCriteria[] {
	try {
		const parsed = JSON.parse(raw) as CsvCriteria[];
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((rule) => columns.includes(rule.column));
	} catch {
		return [];
	}
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const parsed = createLinkSchema.safeParse({
			name: String(form.get('name') ?? '').trim(),
			password: String(form.get('password') ?? '').trim(),
			criteria: String(form.get('criteria') ?? '[]'),
			showSerial: form.get('showSerial') !== null,
			hideFirstColumn: form.get('hideFirstColumn') !== null
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}
		const { name, password, criteria, showSerial, hideFirstColumn } = parsed.data;
		const passwordError = validateLinkPassword(password);
		if (passwordError) {
			return fail(400, { error: passwordError });
		}
		try {
			const current = await getCurrentFile();
			const columns = current?.schema?.columns?.map((col: { name: string }) => col.name) ?? [];
			if (!columns.length) {
				return fail(400, { error: 'CSV schema is missing or empty' });
			}
			const criteriaList = sanitizeCriteria(criteria, columns);
			const link = await createAccessLink({
				name,
				password,
				criteria: criteriaList,
				displayOptions: { showSerial, hideFirstColumn }
			});
			return { success: true, linkId: link.id };
		} catch (error) {
			logError('link_create_failed', { error, name });
			return fail(400, { error: mapActionError(error, 'Unable to create link') });
		}
	},
	deactivate: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing link id' });
		await toggleLink(id, false);
		return { success: true };
	},
	activate: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing link id' });
		await toggleLink(id, true);
		return { success: true };
	},
	rename: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		if (!id || !name) return fail(400, { error: 'Missing link id or name' });
		await updateLinkLabel(id, name);
		return { success: true };
	},
	updateOptions: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const showSerial = form.get('showSerial') !== null;
		const hideFirstColumn = form.get('hideFirstColumn') !== null;
		if (!id) return fail(400, { error: 'Missing link id' });
		await updateLinkOptions(id, { showSerial, hideFirstColumn });
		return { success: true };
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing link id' });
		await deleteLink(id);
		return { success: true };
	}
};
