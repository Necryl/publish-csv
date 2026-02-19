<script lang="ts">
	import { page } from '$app/stores';
	import { submitBusy } from '$lib/submit-busy';
	let { children } = $props();

	const isActive = (path: string) => {
		const currentPath = $page.url.pathname;
		if (path === '/admin') return currentPath === '/admin' || currentPath === '/admin/';
		return currentPath.startsWith(path);
	};
</script>

<div class="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--ink)]">
	<header class="border-b border-[var(--line)] bg-[var(--surface-2)]">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<a href="/" class="hover:text-[var(--accent)]">
				<div class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Publish CSV</div>
				<div class="text-xl font-semibold">Admin Console</div>
			</a>
			{#if !$page.url.pathname.includes('/login')}
				<nav class="flex flex-wrap items-center gap-1 text-xs sm:gap-2 sm:text-sm">
					<a
						class="nav-link rounded-t-lg px-3 py-2 transition-colors {isActive('/admin')
							? 'nav-active'
							: 'hover:text-[var(--accent)]'}"
						href="/admin"
					>
						Overview
					</a>
					<a
						class="nav-link rounded-t-lg px-3 py-2 transition-colors {isActive('/admin/csv')
							? 'nav-active'
							: 'hover:text-[var(--accent)]'}"
						href="/admin/csv"
					>
						CSV
					</a>
					<a
						class="nav-link rounded-t-lg px-3 py-2 transition-colors {isActive('/admin/links')
							? 'nav-active'
							: 'hover:text-[var(--accent)]'}"
						href="/admin/links"
					>
						Links
					</a>
					<a
						class="nav-link rounded-t-lg px-3 py-2 transition-colors {isActive('/admin/requests')
							? 'nav-active'
							: 'hover:text-[var(--accent)]'}"
						href="/admin/requests"
					>
						Requests
					</a>
					<a
						class="nav-link rounded-t-lg px-3 py-2 transition-colors {isActive('/admin/viewers')
							? 'nav-active'
							: 'hover:text-[var(--accent)]'}"
						href="/admin/viewers"
					>
						Viewers
					</a>
					<form method="post" action="/admin/logout" use:submitBusy>
						<button class="btn-secondary ml-2" type="submit"> Sign out </button>
					</form>
				</nav>
			{/if}
		</div>
	</header>
	<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
		{@render children()}
	</main>
</div>
