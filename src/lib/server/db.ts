import { supabase } from './supabase';
import { parseCsv } from './csv';
import type { CsvCriteria, CsvSchema } from './csv';
import {
	decryptBuffer,
	encryptBuffer,
	generateToken,
	hashToken,
	scryptHash,
	scryptVerify
} from './crypto';
import { auditLog } from './auditLog';

export type StoredFile = {
	id: string;
	filename: string;
	storage_path: string;
	schema: CsvSchema;
	row_count: number;
	enc_salt: string;
	enc_iv: string;
	enc_tag: string;
	update_message?: string | null;
	uploaded_at?: string;
};

export type LinkDisplayOptions = {
	showSerial: boolean;
	hideFirstColumn: boolean;
};

export const defaultDisplayOptions: LinkDisplayOptions = {
	showSerial: false,
	hideFirstColumn: false
};

export async function getCurrentFile(): Promise<StoredFile | null> {
	const { data: setting } = await supabase
		.from('app_settings')
		.select('value')
		.eq('key', 'current_file_id')
		.maybeSingle();
	const fileId = setting?.value?.id as string | undefined;
	if (!fileId) return null;
	const { data } = await supabase.from('csv_files').select('*').eq('id', fileId).maybeSingle();
	return data ?? null;
}

export async function setCurrentFile(fileId: string): Promise<void> {
	const { error } = await supabase.from('app_settings').upsert({
		key: 'current_file_id',
		value: { id: fileId },
		updated_at: new Date().toISOString()
	});

	if (error) {
		throw error;
	}
}

export async function updateFileMessage(fileId: string, message: string | null): Promise<void> {
	const { error } = await supabase
		.from('csv_files')
		.update({ update_message: message })
		.eq('id', fileId);
	if (error) {
		throw new Error(error.message);
	}
}

export async function getAllFiles(): Promise<StoredFile[]> {
	const { data, error } = await supabase
		.from('csv_files')
		.select('*')
		.order('uploaded_at', { ascending: false });
	if (error || !data) return [];
	return data;
}

export async function deleteFile(fileId: string): Promise<void> {
	// Get the current active file
	const currentFile = await getCurrentFile();

	// If deleting the active file, clear it from app_settings
	if (currentFile?.id === fileId) {
		const { error: clearError } = await supabase
			.from('app_settings')
			.delete()
			.eq('key', 'current_file_id');
		if (clearError) {
			throw clearError;
		}
	}

	// Get file storage path
	const file = await supabase
		.from('csv_files')
		.select('storage_path')
		.eq('id', fileId)
		.maybeSingle();

	// Delete from storage
	if (file.data?.storage_path) {
		await supabase.storage.from('csv').remove([file.data.storage_path]);
	}

	// Delete from database
	const { error } = await supabase.from('csv_files').delete().eq('id', fileId);
	if (error) {
		throw new Error(error.message);
	}
}

export async function uploadEncryptedCsv(
	file: File,
	parsed: { rows: Record<string, string>[]; headers: string[] },
	schema: CsvSchema,
	updateMessage?: string | null
): Promise<StoredFile> {
	const payload = Buffer.from(await file.arrayBuffer());
	const encrypted = encryptBuffer(payload);
	const storagePath = `csv/${generateToken()}.enc`;

	const { error: uploadError } = await supabase.storage
		.from('csv')
		.upload(storagePath, encrypted.ciphertext, {
			contentType: 'application/octet-stream',
			upsert: true
		});
	if (uploadError) {
		throw new Error(uploadError.message);
	}

	const { data, error } = await supabase
		.from('csv_files')
		.insert({
			filename: file.name,
			storage_path: storagePath,
			schema,
			row_count: parsed.rows.length,
			enc_salt: encrypted.saltHex,
			enc_iv: encrypted.ivHex,
			enc_tag: encrypted.tagHex,
			update_message: updateMessage || null
		})
		.select('*')
		.single();
	if (error || !data) {
		throw new Error(error?.message ?? 'Unable to save file');
	}
	await auditLog('csv_uploaded', {
		fileId: data.id,
		filename: file.name,
		rowCount: parsed.rows.length
	});
	return data;
}

export async function fetchCsvRows(file: StoredFile): Promise<Record<string, string>[]> {
	const { data, error } = await supabase.storage.from('csv').download(file.storage_path);
	if (error || !data) throw new Error(error?.message ?? 'Missing file');
	const buffer = Buffer.from(await data.arrayBuffer());
	const decrypted = decryptBuffer(buffer, file.enc_salt, file.enc_iv, file.enc_tag);
	return parseCsv(decrypted.toString('utf-8')).rows;
}

export async function createAccessLink(input: {
	name: string;
	criteria: CsvCriteria[];
	password: string;
	displayOptions: LinkDisplayOptions;
}): Promise<{ id: string }> {
	const file = await getCurrentFile();
	if (!file) throw new Error('No active CSV file');
	const salt = generateToken();
	const passwordHash = scryptHash(input.password, salt);
	const { data, error } = await supabase
		.from('access_links')
		.insert({
			name: input.name,
			file_id: file.id,
			criteria: input.criteria,
			display_options: input.displayOptions,
			password_salt: salt,
			password_hash: passwordHash
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to create link');
	await auditLog('link_created', { linkId: data.id, name: input.name });
	return { id: data.id };
}

export async function verifyLinkPassword(
	linkId: string,
	password: string
): Promise<{ valid: boolean; alreadyUsed: boolean }> {
	const { data, error } = await supabase
		.from('access_links')
		.select('password_salt, password_hash, active, password_used_at')
		.eq('id', linkId)
		.maybeSingle();
	if (error || !data || !data.active) return { valid: false, alreadyUsed: false };
	const valid = scryptVerify(password, data.password_salt, data.password_hash);
	const alreadyUsed = data.password_used_at !== null;
	return { valid, alreadyUsed };
}

export async function activateDevice(
	linkId: string,
	deviceHash: string,
	markPasswordUsed: boolean = false,
	approvedRequestId?: string
): Promise<string> {
	const token = generateToken();
	const tokenHash = hashToken(token);
	const { data: device, error: deviceError } = await supabase
		.from('link_devices')
		.insert({
			link_id: linkId,
			token_hash: tokenHash,
			ua_hash: deviceHash,
			approved_request_id: approvedRequestId ?? null
		})
		.select('id')
		.single();
	if (deviceError || !device) {
		throw new Error(deviceError?.message ?? 'Unable to activate device');
	}
	if (markPasswordUsed) {
		const { data: updated, error: updateError } = await supabase
			.from('access_links')
			.update({ password_used_at: new Date().toISOString() })
			.eq('id', linkId)
			.is('password_used_at', null)
			.select('id')
			.maybeSingle();
		if (updateError) {
			await supabase.from('link_devices').delete().eq('id', device.id);
			throw new Error(updateError.message);
		}
		if (!updated) {
			await supabase.from('link_devices').delete().eq('id', device.id);
			throw new Error('Password already used');
		}
	}
	await auditLog('viewer_activated', { linkId });
	return token;
}

export async function validateDevice(
	linkId: string,
	token: string,
	deviceHash: string
): Promise<boolean> {
	const tokenHash = hashToken(token);
	const { data } = await supabase
		.from('link_devices')
		.select('id')
		.eq('link_id', linkId)
		.eq('token_hash', tokenHash)
		.eq('ua_hash', deviceHash)
		.maybeSingle();
	return !!data;
}

export async function listLinks(): Promise<any[]> {
	const { data } = await supabase
		.from('access_links')
		.select('id, name, active, criteria, display_options, created_at, csv_files(schema)')
		.order('created_at', { ascending: false });
	return data ?? [];
}

export async function toggleLink(linkId: string, active: boolean): Promise<void> {
	await supabase.from('access_links').update({ active }).eq('id', linkId);
}

export async function updateLinkLabel(linkId: string, name: string): Promise<void> {
	await supabase.from('access_links').update({ name }).eq('id', linkId);
}

export async function updateLinkOptions(
	linkId: string,
	displayOptions: LinkDisplayOptions
): Promise<void> {
	await supabase.from('access_links').update({ display_options: displayOptions }).eq('id', linkId);
}

export async function deleteLink(linkId: string): Promise<void> {
	await supabase.from('access_links').delete().eq('id', linkId);
}

export async function listRequests(): Promise<any[]> {
	const { data } = await supabase
		.from('recovery_requests')
		.select('id, link_id, ua_hash, message, status, created_at')
		.neq('status', 'denied')
		.order('created_at', { ascending: false });
	return data ?? [];
}

export type LinkDevice = {
	id: string;
	link_id: string;
	ua_hash: string;
	created_at: string;
	last_used_at: string | null;
	approved_request_id: string | null;
	access_links?: {
		id: string;
		name: string | null;
		password_used_at: string | null;
	} | null;
};

export type ApprovedRequest = {
	id: string;
	link_id: string;
	ua_hash: string;
	message: string | null;
	created_at: string;
	resolved_at: string | null;
};

export async function listLinkDevices(): Promise<LinkDevice[]> {
	const { data } = await supabase
		.from('link_devices')
		.select(
			'id, link_id, ua_hash, created_at, last_used_at, approved_request_id, access_links(id, name, password_used_at)'
		)
		.order('created_at', { ascending: false });
	return (data ?? []).map((item: any) => ({
		...item,
		access_links: Array.isArray(item.access_links)
			? (item.access_links[0] ?? null)
			: item.access_links
	})) as LinkDevice[];
}

export async function listApprovedRequests(): Promise<ApprovedRequest[]> {
	const { data } = await supabase
		.from('recovery_requests')
		.select('id, link_id, ua_hash, message, created_at, resolved_at')
		.eq('status', 'approved')
		.order('resolved_at', { ascending: false });
	return (data ?? []) as ApprovedRequest[];
}

export async function revokeViewerDevice(deviceId: string): Promise<void> {
	const { data: device, error: deviceError } = await supabase
		.from('link_devices')
		.select('id, link_id, ua_hash')
		.eq('id', deviceId)
		.maybeSingle();
	if (deviceError) throw new Error(deviceError.message);
	if (!device) return;

	const { error: deleteError } = await supabase.from('link_devices').delete().eq('id', deviceId);
	if (deleteError) throw new Error(deleteError.message);
	await auditLog('device_revoked', { deviceId, linkId: device.link_id });

	await supabase
		.from('recovery_requests')
		.update({ status: 'denied', resolved_at: new Date().toISOString() })
		.eq('link_id', device.link_id)
		.eq('ua_hash', device.ua_hash)
		.eq('status', 'approved');
}

export async function submitRecoveryRequest(
	linkId: string,
	deviceHash: string,
	message: string
): Promise<string> {
	const { data, error } = await supabase
		.from('recovery_requests')
		.insert({ link_id: linkId, ua_hash: deviceHash, message })
		.select('id')
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to create request');
	await auditLog('recovery_requested', { requestId: data.id, linkId });
	return data.id;
}

export async function approveRequest(requestId: string): Promise<void> {
	await supabase
		.from('recovery_requests')
		.update({ status: 'approved', resolved_at: new Date().toISOString() })
		.eq('id', requestId);
	await auditLog('recovery_approved', { requestId });
}

export async function denyRequest(requestId: string): Promise<void> {
	await supabase
		.from('recovery_requests')
		.update({ status: 'denied', resolved_at: new Date().toISOString() })
		.eq('id', requestId);
	await auditLog('recovery_denied', { requestId });
}

export async function getLinkWithFile(linkId: string): Promise<any | null> {
	const { data, error } = await supabase
		.from('access_links')
		.select('id, name, criteria, active, display_options, file_id, csv_files(*)')
		.eq('id', linkId)
		.maybeSingle();
	if (error || !data) return null;
	return data;
}

export async function checkApprovedRequest(
	requestId: string
): Promise<{ approved: boolean; linkId: string } | null> {
	const { data } = await supabase
		.from('recovery_requests')
		.select('status, link_id')
		.eq('id', requestId)
		.maybeSingle();
	if (!data) return null;
	return { approved: data.status === 'approved', linkId: data.link_id };
}

export async function getShareMessageTemplate(): Promise<string> {
	const { data } = await supabase
		.from('app_settings')
		.select('value')
		.eq('key', 'share_message_template')
		.maybeSingle();
	return (data?.value?.template as string) ?? '';
}

export async function setShareMessageTemplate(template: string): Promise<void> {
	const { error } = await supabase.from('app_settings').upsert({
		key: 'share_message_template',
		value: { template },
		updated_at: new Date().toISOString()
	});
	if (error) {
		throw error;
	}
	await auditLog('share_template_updated', { templateLength: template.length });
}
