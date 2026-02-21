<script lang="ts">
	import { onMount } from 'svelte';

	type NotificationType = 'admin' | 'viewer';
	type Display = 'icon' | 'text';

	interface Props {
		type: NotificationType;
		display?: Display;
		linkId?: string;
	}

	let { type, display = 'icon', linkId }: Props = $props();

	let enabled = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let currentSubscription: PushSubscription | null = null;

	async function toggleNotifications() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			error = 'Push notifications not supported on this device';
			return;
		}

		loading = true;
		error = null;

		try {
			const registration = await navigator.serviceWorker.register('/sw.js');

			if (enabled) {
				// Turn OFF - unsubscribe
				const subscription = await registration.pushManager.getSubscription();
				if (subscription) {
					await fetch('/api/push/unsubscribe', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ endpoint: subscription.endpoint })
					});
					enabled = false;
				}
			} else {
				// Turn ON - request permission and subscribe
				const permission = await Notification.requestPermission();

				if (permission !== 'granted') {
					error = 'Notification permission denied';
					loading = false;
					return;
				}

				const res = await fetch('/api/push/public-key');
				const { publicKey } = await res.json();

				if (!publicKey) {
					error = 'Push notifications not configured';
					loading = false;
					return;
				}

				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: publicKey
				});

				const subscribeRes = await fetch('/api/push/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						subscription: subscription.toJSON(),
						type,
						...(type === 'viewer' && { linkId })
					})
				});

				if (subscribeRes.ok) {
					enabled = true;
					currentSubscription = subscription;
				} else {
					error = 'Failed to enable notifications';
				}
			}
		} catch (err) {
			console.error('Notification toggle error:', err);
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			try {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();
				if (subscription) {
					enabled = true;
					currentSubscription = subscription;
				}
			} catch (err) {
				console.error('Failed to check subscription status:', err);
			}
		}
	});
</script>

<button
	onclick={toggleNotifications}
	disabled={loading || !('serviceWorker' in navigator)}
	class="notification-toggle {enabled ? 'enabled' : 'disabled'}"
	title={enabled ? 'Notifications enabled' : 'Notifications disabled'}
>
	{#if display === 'text'}
		{#if loading}
			<svg
				class="notification-toggle-spin h-4 w-4"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			Setting up...
		{:else if enabled}
			Turn Notifications OFF
		{:else}
			Turn Notifications ON
		{/if}
	{:else if loading}
		<svg
			class="notification-toggle-spin h-4 w-4"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
		Setting up...
	{:else if enabled}
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			></path>
		</svg>
		On
	{:else}
		<svg class="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			></path>
		</svg>
		Off
	{/if}
</button>

{#if error}
	<div class="mt-2 text-xs text-red-600">{error}</div>
{/if}

<style>
	.notification-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 200ms ease-out;
		border: 1px solid var(--line);
		cursor: pointer;
		background-color: transparent;
		color: var(--ink);
	}

	.notification-toggle.enabled:hover:not(:disabled) {
		background-color: var(--surface-2);
		border-color: var(--accent);
		color: var(--accent);
	}

	.notification-toggle.enabled:active:not(:disabled) {
		transform: translateY(1px);
		background-color: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.notification-toggle.disabled:hover:not(:disabled) {
		background-color: var(--surface-2);
		border-color: var(--accent);
		color: var(--accent);
	}

	.notification-toggle.disabled:active:not(:disabled) {
		transform: translateY(1px);
		background-color: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.notification-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.notification-toggle-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
