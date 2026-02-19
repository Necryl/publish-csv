import crypto from 'node:crypto';
import { requireEnv } from './env';

const masterKey = Buffer.from(requireEnv('ENCRYPTION_MASTER_KEY'), 'base64');
const cookieSecret = requireEnv('COOKIE_SECRET');

export function hashUserAgent(userAgent: string): string {
	return crypto.createHash('sha256').update(userAgent).digest('hex');
}

export function scryptHash(password: string, salt: string): string {
	return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function scryptVerify(password: string, salt: string, expectedHash: string): boolean {
	const actualHash = scryptHash(password, salt);
	return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function generateToken(): string {
	return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export function deriveFileKey(saltHex: string): Buffer {
	const salt = Buffer.from(saltHex, 'hex');
	return Buffer.from(crypto.hkdfSync('sha256', masterKey, salt, Buffer.from('csv-file'), 32));
}

export function encryptBuffer(payload: Buffer): {
	ciphertext: Buffer;
	saltHex: string;
	ivHex: string;
	tagHex: string;
} {
	const salt = crypto.randomBytes(16);
	const key = deriveFileKey(salt.toString('hex'));
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		ciphertext,
		saltHex: salt.toString('hex'),
		ivHex: iv.toString('hex'),
		tagHex: tag.toString('hex')
	};
}

export function decryptBuffer(
	payload: Buffer,
	saltHex: string,
	ivHex: string,
	tagHex: string
): Buffer {
	const key = deriveFileKey(saltHex);
	const iv = Buffer.from(ivHex, 'hex');
	const tag = Buffer.from(tagHex, 'hex');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(payload), decipher.final()]);
}

export function signCookieValue(value: string): string {
	const sig = crypto.createHmac('sha256', cookieSecret).update(value).digest('base64url');
	return `${value}.${sig}`;
}

export function verifySignedCookie(value: string): string | null {
	const lastDot = value.lastIndexOf('.');
	if (lastDot <= 0) return null;
	const raw = value.slice(0, lastDot);
	const sig = value.slice(lastDot + 1);
	const expected = crypto.createHmac('sha256', cookieSecret).update(raw).digest('base64url');
	if (sig.length !== expected.length) return null;
	return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? raw : null;
}
