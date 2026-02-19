import { describe, expect, it } from 'vitest';
import { applyCriteria, inferSchema, parseCsv } from './csv';
import type { CsvSchema } from './csv';

const cleanSampleCsv = `name,age,joined\nAlice,30,2024-01-15\nBob,41,2024-02-01`;
const mixedSampleCsv = `name,age,joined\nAlice,30,2024-01-15\nBob,not-a-number,invalid-date\nCara,,2023-05-01`;

describe('csv helpers', () => {
	it('parses headers even when there are no data rows', () => {
		const parsed = parseCsv('col_a,col_b,col_c\n');
		expect(parsed.headers).toEqual(['col_a', 'col_b', 'col_c']);
		expect(parsed.rows.length).toBe(0);
	});

	it('infers number/date columns from sample rows', () => {
		const parsed = parseCsv(cleanSampleCsv);
		const schema = inferSchema(parsed.rows, parsed.headers);
		const types = Object.fromEntries(schema.columns.map((col) => [col.name, col.type]));
		expect(types.name).toBe('string');
		expect(types.age).toBe('number');
		expect(types.joined).toBe('date');
	});

	it('filters rows and ignores invalid numeric/date values', () => {
		const parsed = parseCsv(mixedSampleCsv);
		const schema: CsvSchema = {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'joined', type: 'date' }
			]
		};
		const filtered = applyCriteria(parsed.rows, schema, [
			{ column: 'age', op: 'gt', value: '10' },
			{ column: 'joined', op: 'gte', value: '2024-01-01' }
		]);

		const names = filtered.map((row) => row.name);
		expect(names).toEqual(['Alice']);
	});

	it('does not match empty numeric cells against numeric rules', () => {
		const parsed = parseCsv(mixedSampleCsv);
		const schema: CsvSchema = {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'joined', type: 'date' }
			]
		};
		const filtered = applyCriteria(parsed.rows, schema, [{ column: 'age', op: 'eq', value: '0' }]);

		expect(filtered.length).toBe(0);
	});
});
