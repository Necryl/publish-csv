<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
	<header class="border-b border-[var(--line)] bg-[var(--surface-2)]">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<div>
				<div class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Publish CSV</div>
				<div class="text-xl font-semibold">Admin Console</div>
			</div>
			<nav class="flex items-center gap-4 text-sm">
				<a class="hover:text-[var(--accent)]" href="/admin">Overview</a>
				<a class="hover:text-[var(--accent)]" href="/admin/csv">CSV</a>
				<a class="hover:text-[var(--accent)]" href="/admin/links">Links</a>
				<a class="hover:text-[var(--accent)]" href="/admin/requests">Requests</a>
				<a
					class="rounded-md border border-[var(--line)] px-3 py-1 hover:border-[var(--accent)]"
					href="/admin/logout"
				>
					Sign out
				</a>
			</nav>
		</div>
	</header>
	<main class="mx-auto max-w-6xl px-6 py-8">{@render children()}</main>
</div>
