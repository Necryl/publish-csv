import { describe, expect, it } from 'vitest';
import { validateAdminPassword, validateLinkPassword } from './validation';

describe('validation', () => {
	it('rejects weak admin passwords', () => {
		expect(validateAdminPassword('short')).toBe('Password must be at least 12 characters');
		expect(validateAdminPassword('longbutlowercase1')).toBe(
			'Password must contain uppercase letters'
		);
		expect(validateAdminPassword('LongButNoNumber')).toBe('Password must contain numbers');
	});

	it('accepts strong admin passwords', () => {
		expect(validateAdminPassword('StrongPass123')).toBeNull();
	});

	it('validates link passwords', () => {
		expect(validateLinkPassword('12345')).toBe('Password must be at least 6 characters');
		expect(validateLinkPassword('123456')).toBeNull();
	});
});
