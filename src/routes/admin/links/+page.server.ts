import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createAccessLink,
	getCurrentFile,
	listLinks,
	toggleLink,
	updateLinkLabel,
	updateLinkOptions
} from '$lib/server/db';
import type { CsvCriteria } from '$lib/server/csv';

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
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '').trim();
		const criteriaRaw = String(form.get('criteria') ?? '[]');
		const showSerial = form.get('showSerial') !== null;
		const hideFirstColumn = form.get('hideFirstColumn') !== null;
		if (!name || !password) {
			return fail(400, { error: 'Missing name or password' });
		}
		try {
			const current = await getCurrentFile();
			const columns = current?.schema?.columns?.map((col: { name: string }) => col.name) ?? [];
			const criteria = sanitizeCriteria(criteriaRaw, columns);
			const link = await createAccessLink({
				name,
				password,
				criteria,
				displayOptions: { showSerial, hideFirstColumn }
			});
			return { success: true, linkId: link.id };
		} catch (error) {
			return fail(400, { error: (error as Error).message });
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
	}
};
