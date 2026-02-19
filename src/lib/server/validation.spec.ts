import { describe, expect, it } from 'vitest';
import { validateAdminPassword, validateLinkPassword } from './validation';

describe('validation', () => {
	it('validates admin password length', () => {
		expect(validateAdminPassword('short')).toBe('Password must be at least 6 characters');
		expect(validateAdminPassword('validpass')).toBeNull();
		expect(validateAdminPassword('simple')).toBeNull();
	});

	it('accepts any link password', () => {
		expect(validateLinkPassword('')).toBeNull();
		expect(validateLinkPassword('x')).toBeNull();
		expect(validateLinkPassword('anything')).toBeNull();
	});
});
