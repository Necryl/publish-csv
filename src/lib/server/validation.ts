export function validateAdminPassword(password: string): string | null {
	if (password.length < 12) {
		return 'Password must be at least 12 characters';
	}
	if (!/[A-Z]/.test(password)) {
		return 'Password must contain uppercase letters';
	}
	if (!/[0-9]/.test(password)) {
		return 'Password must contain numbers';
	}
	return null;
}

export function validateLinkPassword(password: string): string | null {
	if (password.length < 6) {
		return 'Password must be at least 6 characters';
	}
	return null;
}
