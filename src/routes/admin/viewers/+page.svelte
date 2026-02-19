<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
	let viewers = $derived(data.viewers ?? []);
	let selectedLinkId = $state<string>('');

	let filteredViewers = $derived(
		selectedLinkId === '' ? viewers : viewers.filter((viewer) => viewer.linkId === selectedLinkId)
	);

	const confirmRevoke = (event: MouseEvent) => {
		if (!window.confirm('Remove this viewer access?')) {
			event.preventDefault();
		}
	};
</script>

<section class="card">
	<h1 class="text-xl font-semibold">Approved viewers</h1>
	<p class="mt-2 text-sm text-[var(--muted)]">
		Devices and users that have been approved to access a link.
	</p>

	{#if data.links?.length > 0}
		<div class="mt-4 grid gap-2 sm:max-w-xs">
			<label for="link-filter-viewers" class="text-sm font-semibold">Filter by link</label>
			<select
				id="link-filter-viewers"
				class="rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
				bind:value={selectedLinkId}
			>
				<option value="">All links</option>
				{#each data.links as link (link.id)}
					<option value={link.id}>{link.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if !filteredViewers.length}
		<p class="mt-4 text-sm text-[var(--muted)]">
			{viewers.length === 0 ? 'No viewers approved yet.' : 'No viewers for selected link.'}
		</p>
	{:else}
		<div class="mt-4 grid gap-3">
			{#each filteredViewers as viewer (viewer.id)}
				<div
					class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition-all hover:shadow-md sm:p-5"
				>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-sm font-semibold">{viewer.linkName}</p>
							<p class="text-xs text-[var(--muted)]">Link {viewer.linkId}</p>
						</div>
						<div class="flex items-center gap-3 text-xs text-[var(--muted)]">
							<span>
								{viewer.createdAt ? new Date(viewer.createdAt).toLocaleString() : 'Unknown time'}
							</span>
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={viewer.id} />
								<button
									class="btn-danger text-xs"
									formaction="?/revoke"
									type="submit"
									onclick={confirmRevoke}
								>
									Revoke
								</button>
							</form>
						</div>
					</div>
					<p class="mt-2 text-xs text-[var(--muted)]">UA: {viewer.uaHash}</p>
					{#if viewer.lastUsedAt}
						<p class="mt-1 text-xs text-[var(--muted)]">
							Last used {new Date(viewer.lastUsedAt).toLocaleString()}
						</p>
					{/if}
					{#if viewer.approval.type === 'request'}
						<p class="mt-3 text-sm text-[var(--muted)]">
							Approved request:
							{viewer.approval.message?.trim() ? viewer.approval.message : 'No message provided.'}
						</p>
					{:else}
						<p class="mt-3 text-sm text-[var(--muted)]">Approved via one-time password.</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error mt-4">
			<span>{form.error}</span>
		</div>
	{/if}
</section>
