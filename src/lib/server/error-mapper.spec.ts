import { describe, expect, it } from 'vitest';
import { mapActionError } from './error-mapper';

describe('mapActionError', () => {
	it('maps duplicate key errors', () => {
		const message = mapActionError(
			new Error('duplicate key value violates unique constraint'),
			'Fallback'
		);
		expect(message).toBe('That item already exists.');
	});

	it('maps invalid input errors', () => {
		const message = mapActionError({ message: 'invalid input syntax for uuid' }, 'Fallback');
		expect(message).toBe('Invalid input. Please check your entries.');
	});

	it('falls back to default message when unknown', () => {
		const message = mapActionError(new Error('something else'), 'Fallback');
		expect(message).toBe('Fallback');
	});
});
