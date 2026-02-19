import { parse } from 'csv-parse/sync';

export type CsvColumnType = 'string' | 'number' | 'date';
export type CsvSchema = {
	columns: { name: string; type: CsvColumnType }[];
};

export type CsvCriteriaOp = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
export type CsvCriteria = { column: string; op: CsvCriteriaOp; value: string };

export function parseCsv(text: string): { rows: Record<string, string>[]; headers: string[] } {
	const records = parse(text, {
		columns: true,
		skip_empty_lines: true,
		trim: true
	}) as Record<string, string>[];

	const headers = records.length > 0 ? Object.keys(records[0]) : [];
	return { rows: records, headers };
}

export function inferSchema(rows: Record<string, string>[], headers: string[]): CsvSchema {
	const sample = rows.slice(0, 50);
	const columns = headers.map((name) => ({ name, type: inferColumnType(sample, name) }));
	return { columns };
}

function inferColumnType(rows: Record<string, string>[], column: string): CsvColumnType {
	let sawNumber = false;
	let sawDate = false;
	for (const row of rows) {
		const raw = row[column];
		if (!raw) continue;
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;
		const num = Number(trimmed);
		if (!Number.isNaN(num) && Number.isFinite(num)) {
			sawNumber = true;
			continue;
		}
		const date = Date.parse(trimmed);
		if (!Number.isNaN(date)) {
			sawDate = true;
			continue;
		}
		return 'string';
	}
	if (sawNumber && !sawDate) return 'number';
	if (sawDate && !sawNumber) return 'date';
	if (sawNumber || sawDate) return 'string';
	return 'string';
}

export function applyCriteria(
	rows: Record<string, string>[],
	schema: CsvSchema,
	criteria: CsvCriteria[]
): Record<string, string>[] {
	if (!criteria.length) return rows;
	const typeMap = new Map(schema.columns.map((col) => [col.name, col.type]));
	return rows.filter((row) => criteria.every((rule) => matchRule(row, rule, typeMap)));
}

function matchRule(
	row: Record<string, string>,
	rule: CsvCriteria,
	typeMap: Map<string, CsvColumnType>
): boolean {
	const value = row[rule.column] ?? '';
	const type = typeMap.get(rule.column) ?? 'string';
	const left = normalizeValue(value, type);
	const right = normalizeValue(rule.value, type);

	switch (rule.op) {
		case 'eq':
			return left === right;
		case 'contains':
			return String(left).toLowerCase().includes(String(right).toLowerCase());
		case 'gt':
			return Number(left) > Number(right);
		case 'gte':
			return Number(left) >= Number(right);
		case 'lt':
			return Number(left) < Number(right);
		case 'lte':
			return Number(left) <= Number(right);
		default:
			return false;
	}
}

function normalizeValue(value: string, type: CsvColumnType): string | number {
	if (type === 'number') {
		const num = Number(value);
		return Number.isNaN(num) ? 0 : num;
	}
	if (type === 'date') {
		const date = Date.parse(value);
		return Number.isNaN(date) ? 0 : date;
	}
	return value;
}
