import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	activateDevice,
	checkApprovedRequest,
	fetchCsvRows,
	getLinkWithFile,
	submitRecoveryRequest,
	validateDevice,
	verifyLinkPassword,
	getCurrentFile
} from '$lib/server/db';
import { applyCriteria } from '$lib/server/csv';
import { hashDeviceFingerprint, signCookieValue, verifySignedCookie } from '$lib/server/crypto';
import { getRateLimitKey, rateLimit } from '$lib/server/rateLimit';
import { recoveryRequestSchema } from '$lib/server/schemas';
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

export const load: PageServerLoad = async ({ params, cookies, request, getClientAddress }) => {
	const link = await getLinkWithFile(params.linkId);
	if (!link || !link.active) {
		return { status: 'inactive' };
	}
	const userAgent = request.headers.get('user-agent') ?? '';
	const acceptLanguage = request.headers.get('accept-language') ?? '';
	const clientIp = getClientAddress?.() ?? 'unknown';
	const deviceHash = hashDeviceFingerprint(userAgent, acceptLanguage, clientIp);
	const deviceCookie = cookies.get(deviceCookieName(link.id));
	let authorized = false;

	if (deviceCookie) {
		const raw = verifySignedCookie(deviceCookie);
		if (raw) {
			authorized = await validateDevice(link.id, raw, deviceHash);
		}
	}

	if (!authorized) {
		const requestCookie = cookies.get(requestCookieName(link.id));
		if (requestCookie) {
			const raw = verifySignedCookie(requestCookie);
			if (raw) {
				const approved = await checkApprovedRequest(raw);
				if (approved?.approved && approved.linkId === link.id) {
					const token = await activateDevice(link.id, deviceHash, false, raw);
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

	// Use the currently active file, not the one linked at creation time
	const file = await getCurrentFile();
	if (!file) {
		return { status: 'inactive' };
	}

	let rows: Row[] = [];
	try {
		rows = await fetchCsvRows(file);
	} catch {
		return { status: 'inactive' };
	}
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

	const result = {
		status: 'ok',
		name: link.name,
		columns: displayColumns,
		rows: displayRows,
		total: filtered.length,
		truncated: filtered.length > preview.length,
		updateMessage: file.update_message ?? null
	};
	return result;
};

export const actions: Actions = {
	login: async (event) => {
		const { params, request, cookies } = event;
		const rateKey = getRateLimitKey(event, 'viewer_login', params.linkId);
		if (!rateLimit(rateKey)) {
			return fail(429, { error: 'Too many attempts. Try again later.' });
		}
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		if (!password) return fail(400, { error: 'Password required' });
		const result = await verifyLinkPassword(params.linkId, password);
		if (result.alreadyUsed) {
			return fail(400, {
				error:
					'This link is secured with a one-time password. It has already been used. Contact the admin to request access from this device.'
			});
		}
		if (!result.valid) return fail(400, { error: 'Invalid password' });
		const userAgent = request.headers.get('user-agent') ?? '';
		const acceptLanguage = request.headers.get('accept-language') ?? '';
		const clientIp = event.getClientAddress?.() ?? 'unknown';
		const deviceHash = hashDeviceFingerprint(userAgent, acceptLanguage, clientIp);
		let token: string;
		try {
			token = await activateDevice(params.linkId, deviceHash, true);
		} catch (error) {
			const message = error instanceof Error ? error.message : '';
			if (/already used/i.test(message)) {
				return fail(400, {
					error:
						'This link is secured with a one-time password. It has already been used. Contact the admin to request access from this device.'
				});
			}
			return fail(400, { error: 'Unable to activate this device. Try again later.' });
		}
		cookies.set(deviceCookieName(params.linkId), signCookieValue(token), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 30
		});
		throw redirect(303, `/v/${params.linkId}`);
	},
	request: async (event) => {
		const { params, request, cookies } = event;
		const rateKey = getRateLimitKey(event, 'viewer_request', params.linkId);
		if (!rateLimit(rateKey)) {
			return fail(429, { error: 'Too many requests. Try again later.' });
		}
		const form = await request.formData();
		const parsed = recoveryRequestSchema.safeParse({
			message: form.get('message') ?? undefined
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}
		const message = (parsed.data.message ?? '').trim();
		const userAgent = request.headers.get('user-agent') ?? '';
		const acceptLanguage = request.headers.get('accept-language') ?? '';
		const clientIp = event.getClientAddress?.() ?? 'unknown';
		const deviceHash = hashDeviceFingerprint(userAgent, acceptLanguage, clientIp);
		const requestId = await submitRecoveryRequest(params.linkId, deviceHash, message);
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
