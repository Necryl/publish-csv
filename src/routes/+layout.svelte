<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Register service worker for push notifications
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((error) => {
				console.error('Service Worker registration failed:', error);
			});
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
