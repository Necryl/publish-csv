import type { RequestEvent } from '@sveltejs/kit';

type RateLimitRecord = {
	count: number;
	resetTime: number;
};

const attempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = 0;

function pruneExpired(now: number): void {
	if (now - lastPrune < PRUNE_INTERVAL_MS) return;
	lastPrune = now;
	for (const [key, record] of attempts) {
		if (now > record.resetTime) {
			attempts.delete(key);
		}
	}
}

export function rateLimit(identifier: string): boolean {
	const now = Date.now();
	pruneExpired(now);
	const record = attempts.get(identifier);

	if (!record || now > record.resetTime) {
		attempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
		return true;
	}

	record.count += 1;
	if (record.count > MAX_ATTEMPTS) {
		return false;
	}

	return true;
}

export function getRateLimitKey(event: RequestEvent, type: string, suffix: string = ''): string {
	const clientAddress = event.getClientAddress?.();
	const forwardedFor = event.request.headers.get('x-forwarded-for');
	const ip = clientAddress || forwardedFor || 'unknown';
	return `${type}:${ip}${suffix ? `:${suffix}` : ''}`;
}
