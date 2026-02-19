export function validateAdminPassword(password: string): string | null {
	if (password.length < 6) {
		return 'Password must be at least 6 characters';
	}
	return null;
}

export function validateLinkPassword(password: string): string | null {
	return null;
}
