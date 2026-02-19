import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	activateDevice,
	checkApprovedRequest,
	fetchCsvRows,
	getLinkWithFile,
	submitRecoveryRequest,
	validateDevice,
	verifyLinkPassword
} from '$lib/server/db';
import { applyCriteria } from '$lib/server/csv';
import { signCookieValue, verifySignedCookie } from '$lib/server/crypto';
import { dev } from '$app/environment';

const MAX_ROWS = 500;
type Row = Record<string, string>;
type Column = { name: string };

function deviceCookieName(linkId: string): string {
	return `link_${linkId}`;
}

function requestCookieName(linkId: string): string {
	return `request_${linkId}`;
}

export const load: PageServerLoad = async ({ params, cookies, request }) => {
	const link = await getLinkWithFile(params.linkId);
	if (!link || !link.active) {
		return { status: 'inactive' };
	}
	const userAgent = request.headers.get('user-agent') ?? '';
	const deviceCookie = cookies.get(deviceCookieName(link.id));
	let authorized = false;

	if (deviceCookie) {
		const raw = verifySignedCookie(deviceCookie);
		if (raw) {
			authorized = await validateDevice(link.id, raw, userAgent);
		}
	}

	if (!authorized) {
		const requestCookie = cookies.get(requestCookieName(link.id));
		if (requestCookie) {
			const raw = verifySignedCookie(requestCookie);
			if (raw) {
				const approved = await checkApprovedRequest(raw);
				if (approved?.approved && approved.linkId === link.id) {
					const token = await activateDevice(link.id, userAgent);
					cookies.set(deviceCookieName(link.id), signCookieValue(token), {
						path: '/',
						httpOnly: true,
						sameSite: 'strict',
						secure: !dev,
						maxAge: 60 * 60 * 24 * 30
					});
					cookies.delete(requestCookieName(link.id), { path: '/' });
					authorized = true;
				}
			}
		}
	}

	if (!authorized) {
		return { status: 'locked', name: link.name };
	}

	const file = link.csv_files;
	if (!file) {
		return { status: 'inactive' };
	}
	const rows = await fetchCsvRows(file);
	const filtered = applyCriteria(rows, file.schema, link.criteria ?? []);
	const preview: Row[] = filtered.slice(0, MAX_ROWS);
	const options = link.display_options ?? { showSerial: false, hideFirstColumn: false };
	const baseColumns: Column[] = file.schema.columns ?? [];
	const visibleColumns: Column[] = options.hideFirstColumn ? baseColumns.slice(1) : baseColumns;
	const serialLabel = 'No.';
	const displayColumns: Column[] = options.showSerial
		? [{ name: serialLabel }, ...visibleColumns]
		: visibleColumns;
	const displayRows: Row[] = options.showSerial
		? preview.map((row, index) => ({ ...row, [serialLabel]: String(index + 1) }))
		: preview;

	if (options.hideFirstColumn && baseColumns.length > 0) {
		const firstName = baseColumns[0].name;
		for (const row of displayRows) {
			delete row[firstName];
		}
	}

	return {
		status: 'ok',
		name: link.name,
		columns: displayColumns,
		rows: displayRows,
		total: filtered.length,
		truncated: filtered.length > preview.length
	};
};

export const actions: Actions = {
	login: async ({ params, request, cookies }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		if (!password) return fail(400, { error: 'Password required' });
		const ok = await verifyLinkPassword(params.linkId, password);
		if (!ok) return fail(400, { error: 'Invalid password' });
		const token = await activateDevice(params.linkId, request.headers.get('user-agent') ?? '');
		cookies.set(deviceCookieName(params.linkId), signCookieValue(token), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 30
		});
		throw redirect(303, `/v/${params.linkId}`);
	},
	request: async ({ params, request, cookies }) => {
		const form = await request.formData();
		const message = String(form.get('message') ?? '').trim();
		const requestId = await submitRecoveryRequest(
			params.linkId,
			request.headers.get('user-agent') ?? '',
			message
		);
		cookies.set(requestCookieName(params.linkId), signCookieValue(requestId), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: 60 * 60 * 24
		});
		return { requested: true };
	}
};
