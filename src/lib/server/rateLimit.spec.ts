import { describe, expect, it, vi } from 'vitest';
import { rateLimit } from './rateLimit';

describe('rateLimit', () => {
	it('allows up to the max attempts within the window', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(0));

		for (let i = 0; i < 5; i += 1) {
			expect(rateLimit('key')).toBe(true);
		}
		expect(rateLimit('key')).toBe(false);

		vi.useRealTimers();
	});

	it('resets after the window expires', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(0));

		for (let i = 0; i < 5; i += 1) {
			rateLimit('key2');
		}
		expect(rateLimit('key2')).toBe(false);

		vi.setSystemTime(new Date(61 * 1000));
		expect(rateLimit('key2')).toBe(true);

		vi.useRealTimers();
	});
});
