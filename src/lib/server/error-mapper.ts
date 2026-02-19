type ErrorLike = {
	message?: string;
	code?: string | number;
};

export function mapActionError(error: unknown, fallback: string): string {
	const err = error as ErrorLike | null | undefined;
	const message = err?.message ?? '';

	if (/duplicate key|unique constraint/i.test(message)) {
		return 'That item already exists.';
	}

	if (/invalid input|invalid uuid|invalid syntax/i.test(message)) {
		return 'Invalid input. Please check your entries.';
	}

	if (/not found|missing file/i.test(message)) {
		return 'Requested item was not found.';
	}

	if (/storage|bucket|object/i.test(message)) {
		return 'Storage service error. Please try again.';
	}

	if (/missing env/i.test(message)) {
		return 'Server configuration error.';
	}

	if (/permission|not authorized|unauthorized/i.test(message)) {
		return 'You are not allowed to perform this action.';
	}

	if (/timeout|network|fetch failed/i.test(message)) {
		return 'Temporary server issue. Please try again.';
	}

	return fallback;
}
