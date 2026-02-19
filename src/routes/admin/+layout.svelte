<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--ink)]">
	<header class="border-b border-[var(--line)] bg-[var(--surface-2)]">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<div>
				<div class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Publish CSV</div>
				<div class="text-xl font-semibold">Admin Console</div>
			</div>
			<nav class="flex flex-wrap items-center gap-3 text-xs sm:gap-4 sm:text-sm">
				<a class="hover:text-[var(--accent)]" href="/admin">Overview</a>
				<a class="hover:text-[var(--accent)]" href="/admin/csv">CSV</a>
				<a class="hover:text-[var(--accent)]" href="/admin/links">Links</a>
				<a class="hover:text-[var(--accent)]" href="/admin/requests">Requests</a>
				<form method="post" action="/admin/logout" use:submitBusy>
					<button
						class="rounded-md border border-[var(--line)] px-3 py-1 hover:border-[var(--accent)]"
						type="submit"
					>
						Sign out
					</button>
				</form>
			</nav>
		</div>
	</header>
	<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
		{@render children()}
	</main>
</div>
