<script lang="ts">
	let { data } = $props();
</script>

<section class="grid gap-6 md:grid-cols-3">
	<div class="card">
		<p class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Current CSV</p>
		<h2 class="mt-3 text-lg font-semibold">
			{data.current ? data.current.filename : 'No file uploaded'}
		</h2>
		<p class="mt-2 text-sm text-[var(--muted)]">
			{data.current ? `${data.current.row_count} rows` : 'Upload a CSV to begin.'}
		</p>
		<a
			class="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] transition-colors hover:opacity-80"
			href="/admin/csv"
		>
			Manage CSV →
		</a>
	</div>
	<div class="card">
		<p class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Links</p>
		<h2 class="mt-3 text-lg font-semibold">{data.linkCount}</h2>
		<p class="mt-2 text-sm text-[var(--muted)]">Active share links created.</p>
		<a
			class="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] transition-colors hover:opacity-80"
			href="/admin/links"
		>
			Manage links →
		</a>
	</div>
	<div class="card">
		<p class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Recovery</p>
		<h2 class="mt-3 text-lg font-semibold">{data.pendingRequests}</h2>
		<p class="mt-2 text-sm text-[var(--muted)]">Pending access requests.</p>
		<a
			class="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] transition-colors hover:opacity-80"
			href="/admin/requests"
		>
			Review requests →
		</a>
	</div>
</section>
