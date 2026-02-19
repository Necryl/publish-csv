import { parse } from 'csv-parse/sync';

export type CsvColumnType = 'string' | 'number' | 'date';
export type CsvSchema = {
	columns: { name: string; type: CsvColumnType }[];
};

export type CsvCriteriaOp = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
export type CsvCriteria = {
	column: string;
	op: CsvCriteriaOp;
	value: string;
	caseSensitive?: boolean;
};

const MAX_CSV_SIZE_MB = 10;
const MAX_CSV_SIZE_BYTES = MAX_CSV_SIZE_MB * 1024 * 1024;

export function validateCsvSize(file: File): string | null {
	if (file.size > MAX_CSV_SIZE_BYTES) {
		return `File exceeds ${MAX_CSV_SIZE_MB}MB limit`;
	}
	return null;
}

export function parseCsv(text: string): { rows: Record<string, string>[]; headers: string[] } {
	const records = parse(text, {
		columns: true,
		skip_empty_lines: true,
		trim: true
	}) as Record<string, string>[];

	let headers = records.length > 0 ? Object.keys(records[0]) : [];
	if (!headers.length) {
		const headerRows = parse(text, {
			columns: false,
			skip_empty_lines: true,
			trim: true
		}) as Array<Array<string | number | boolean | null>>;
		if (headerRows.length > 0) {
			headers = headerRows[0].map((value) => String(value ?? '').trim()).filter(Boolean);
		}
	}

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

	if (left === null || right === null) return false;

	switch (rule.op) {
		case 'eq': {
			if (type === 'string' && !rule.caseSensitive) {
				return String(left).toLowerCase() === String(right).toLowerCase();
			}
			return left === right;
		}
		case 'contains': {
			const leftStr = String(left);
			const rightStr = String(right);
			if (rule.caseSensitive) {
				return leftStr.includes(rightStr);
			}
			return leftStr.toLowerCase().includes(rightStr.toLowerCase());
		}
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

function normalizeValue(value: string, type: CsvColumnType): string | number | null {
	const trimmed = value.trim();
	if (type === 'number') {
		if (!trimmed) return null;
		const num = Number(trimmed);
		return Number.isNaN(num) ? null : num;
	}
	if (type === 'date') {
		if (!trimmed) return null;
		const date = Date.parse(trimmed);
		return Number.isNaN(date) ? null : date;
	}
	return value;
}
