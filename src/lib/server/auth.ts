import { supabase } from './supabase';
import {
	generateToken,
	hashUserAgent,
	scryptHash,
	scryptVerify,
	signCookieValue,
	verifySignedCookie
} from './crypto';
import { requireEnv } from './env';

const adminEmail = requireEnv('ADMIN_EMAIL');
const adminPassword = requireEnv('ADMIN_PASSWORD');

export type AdminSession = {
	sessionId: string;
	userAgentHash: string;
	expiresAt: string;
};

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
	if (email !== adminEmail) return false;
	return scryptVerify(password, adminEmail, scryptHashFromEnv());
}

function scryptHashFromEnv(): string {
	return scryptHash(adminPassword, adminEmail);
}

export async function createAdminSession(userAgent: string): Promise<AdminSession> {
	const sessionId = generateToken();
	const userAgentHash = hashUserAgent(userAgent);
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();

	await supabase.from('admin_sessions').delete().neq('session_id', '');
	await supabase.from('admin_sessions').insert({
		session_id: sessionId,
		ua_hash: userAgentHash,
		expires_at: expiresAt
	});

	return { sessionId, userAgentHash, expiresAt };
}

export async function clearAdminSessions(): Promise<void> {
	await supabase.from('admin_sessions').delete().neq('session_id', '');
}

export function adminSessionCookieValue(sessionId: string): string {
	return signCookieValue(sessionId);
}

export async function validateAdminSession(
	cookieValue: string | undefined,
	userAgent: string
): Promise<boolean> {
	if (!cookieValue) return false;
	const raw = verifySignedCookie(cookieValue);
	if (!raw) return false;
	const userAgentHash = hashUserAgent(userAgent);
	const { data, error } = await supabase
		.from('admin_sessions')
		.select('session_id, ua_hash, expires_at')
		.eq('session_id', raw)
		.maybeSingle();
	if (error || !data) return false;
	if (data.ua_hash !== userAgentHash) return false;
	if (new Date(data.expires_at).getTime() < Date.now()) return false;
	return true;
}
