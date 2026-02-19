import { env } from '$env/dynamic/private';

export function requireEnv(key: string): string {
	const value = env[key];
	if (!value) {
		throw new Error(`Missing env: ${key}`);
	}
	return value;
}
