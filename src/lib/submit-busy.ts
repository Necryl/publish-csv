export function submitBusy(form: HTMLFormElement) {
	const handler = () => {
		form.setAttribute('aria-busy', 'true');
		const buttons = Array.from(form.querySelectorAll('button'));
		for (const button of buttons) {
			button.disabled = true;
		}
	};

	form.addEventListener('submit', handler);

	return {
		destroy() {
			form.removeEventListener('submit', handler);
		}
	};
}
