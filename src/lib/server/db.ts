import { supabase } from './supabase';
import { parseCsv } from './csv';
import type { CsvCriteria, CsvSchema } from './csv';
import {
	decryptBuffer,
	encryptBuffer,
	generateToken,
	hashToken,
	hashUserAgent,
	scryptHash,
	scryptVerify
} from './crypto';

export type StoredFile = {
	id: string;
	filename: string;
	storage_path: string;
	schema: CsvSchema;
	row_count: number;
	enc_salt: string;
	enc_iv: string;
	enc_tag: string;
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
	await supabase.from('app_settings').upsert({
		key: 'current_file_id',
		value: { id: fileId },
		updated_at: new Date().toISOString()
	});
}

export async function uploadEncryptedCsv(
	file: File,
	parsed: { rows: Record<string, string>[]; headers: string[] },
	schema: CsvSchema
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
			enc_tag: encrypted.tagHex
		})
		.select('*')
		.single();
	if (error || !data) {
		throw new Error(error?.message ?? 'Unable to save file');
	}
	await setCurrentFile(data.id);
	await supabase.from('access_links').update({ file_id: data.id }).neq('id', '');
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
			password_salt: salt,
			password_hash: passwordHash
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to create link');
	return { id: data.id };
}

export async function verifyLinkPassword(linkId: string, password: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('access_links')
		.select('password_salt, password_hash, active')
		.eq('id', linkId)
		.maybeSingle();
	if (error || !data || !data.active) return false;
	return scryptVerify(password, data.password_salt, data.password_hash);
}

export async function activateDevice(linkId: string, userAgent: string): Promise<string> {
	const token = generateToken();
	const tokenHash = hashToken(token);
	const uaHash = hashUserAgent(userAgent);
	await supabase.from('link_devices').insert({
		link_id: linkId,
		token_hash: tokenHash,
		ua_hash: uaHash
	});
	return token;
}

export async function validateDevice(
	linkId: string,
	token: string,
	userAgent: string
): Promise<boolean> {
	const tokenHash = hashToken(token);
	const uaHash = hashUserAgent(userAgent);
	const { data } = await supabase
		.from('link_devices')
		.select('id')
		.eq('link_id', linkId)
		.eq('token_hash', tokenHash)
		.eq('ua_hash', uaHash)
		.maybeSingle();
	return !!data;
}

export async function listLinks(): Promise<any[]> {
	const { data } = await supabase
		.from('access_links')
		.select('id, name, active, criteria, created_at')
		.order('created_at', { ascending: false });
	return data ?? [];
}

export async function toggleLink(linkId: string, active: boolean): Promise<void> {
	await supabase.from('access_links').update({ active }).eq('id', linkId);
}

export async function listRequests(): Promise<any[]> {
	const { data } = await supabase
		.from('recovery_requests')
		.select('id, link_id, ua_hash, message, status, created_at')
		.neq('status', 'denied')
		.order('created_at', { ascending: false });
	return data ?? [];
}

export async function submitRecoveryRequest(
	linkId: string,
	userAgent: string,
	message: string
): Promise<string> {
	const uaHash = hashUserAgent(userAgent);
	const { data, error } = await supabase
		.from('recovery_requests')
		.insert({ link_id: linkId, ua_hash: uaHash, message })
		.select('id')
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to create request');
	return data.id;
}

export async function approveRequest(requestId: string): Promise<void> {
	await supabase
		.from('recovery_requests')
		.update({ status: 'approved', resolved_at: new Date().toISOString() })
		.eq('id', requestId);
}

export async function denyRequest(requestId: string): Promise<void> {
	await supabase
		.from('recovery_requests')
		.update({ status: 'denied', resolved_at: new Date().toISOString() })
		.eq('id', requestId);
}

export async function getLinkWithFile(linkId: string): Promise<any | null> {
	const { data, error } = await supabase
		.from('access_links')
		.select('id, name, criteria, active, file_id, csv_files(*)')
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
