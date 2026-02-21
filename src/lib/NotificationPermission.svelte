<script lang="ts">
	import { onMount } from 'svelte';

	type NotificationType = 'admin' | 'viewer';

	interface Props {
		type: NotificationType;
		linkId?: string;
	}

	let { type, linkId }: Props = $props();

	let permissionGranted = $state(false);
	let permissionDenied = $state(false);
	let subscribed = $state(false);
	let loading = $state(false);

	async function requestPermission() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			console.error('Push notifications not supported');
			return;
		}

		loading = true;
		try {
			// Register service worker
			const registration = await navigator.serviceWorker.register('/sw.js');

			// Request notification permission
			const permission = await Notification.requestPermission();

			if (permission === 'granted') {
				permissionGranted = true;
				await subscribeToNotifications(registration);
			} else if (permission === 'denied') {
				permissionDenied = true;
			}
		} catch (error) {
			console.error('Failed to request notification permission:', error);
			permissionDenied = true;
		} finally {
			loading = false;
		}
	}

	async function subscribeToNotifications(registration: ServiceWorkerRegistration) {
		try {
			const res = await fetch('/api/push/public-key');
			const { publicKey } = await res.json();

			if (!publicKey) {
				console.error('VAPID public key not configured');
				return;
			}

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: publicKey
			});

			// Send subscription to server
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
				subscribed = true;
			} else {
				console.error('Failed to send subscription to server');
			}
		} catch (error) {
			console.error('Failed to subscribe to push notifications:', error);
		}
	}

	onMount(() => {
		// Check if already subscribed
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then((registration) => {
				registration.pushManager.getSubscription().then((subscription) => {
					if (subscription) {
						subscribed = true;
					}
				});
			});
		}

		// Check permission status
		if ('Notification' in window) {
			if (Notification.permission === 'granted') {
				permissionGranted = true;
			} else if (Notification.permission === 'denied') {
				permissionDenied = true;
			}
		}
	});
</script>

{#if !permissionGranted && !permissionDenied && !subscribed}
	<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium text-blue-900">Get notifications</p>
				<p class="text-blue-700">
					{type === 'admin'
						? 'Receive notifications about new recovery requests'
						: 'Receive notifications when the CSV data is updated'}
				</p>
			</div>
			<button
				onclick={requestPermission}
				disabled={loading}
				class="ml-4 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
			>
				{loading ? 'Setting up...' : 'Enable'}
			</button>
		</div>
	</div>
{:else if subscribed}
	<div class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
		<p class="text-green-900">✓ Notifications enabled</p>
	</div>
{/if}
