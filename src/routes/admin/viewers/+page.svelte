<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
	let viewers = $derived(data.viewers ?? []);

	const confirmRevoke = (event: MouseEvent) => {
		if (!window.confirm('Remove this viewer access?')) {
			event.preventDefault();
		}
	};
</script>

<section class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
	<h1 class="text-xl font-semibold">Approved viewers</h1>
	<p class="mt-2 text-sm text-[var(--muted)]">
		Devices and users that have been approved to access a link.
	</p>

	{#if !viewers.length}
		<p class="mt-4 text-sm text-[var(--muted)]">No viewers approved yet.</p>
	{:else}
		<div class="mt-4 grid gap-3">
			{#each viewers as viewer (viewer.id)}
				<div class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-sm font-semibold">{viewer.linkName}</p>
							<p class="text-xs text-[var(--muted)]">Link {viewer.linkId}</p>
						</div>
						<div class="flex items-center gap-3 text-xs text-[var(--muted)]">
							<span>
								{viewer.createdAt
									? new Date(viewer.createdAt).toLocaleString()
									: 'Unknown time'}
							</span>
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={viewer.id} />
								<button
									class="rounded-md border border-red-300 px-2 py-1 text-[10px] text-red-600 hover:text-red-700"
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
							{viewer.approval.message?.trim()
								? viewer.approval.message
								: 'No message provided.'}
						</p>
					{:else}
						<p class="mt-3 text-sm text-[var(--muted)]">Approved via one-time password.</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if form?.error}
		<p class="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
			{form.error}
		</p>
	{/if}
</section>
