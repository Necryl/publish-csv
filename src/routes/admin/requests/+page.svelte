<script lang="ts">
	let { data, form } = $props();
</script>

<section class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
	<h1 class="text-xl font-semibold">Recovery requests</h1>
	{#if !data.requests.length}
		<p class="mt-2 text-sm text-[var(--muted)]">No requests yet.</p>
	{:else}
		<div class="mt-4 grid gap-3">
			{#each data.requests as request (request.id)}
				<div class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-sm font-semibold">Link {request.link_id}</p>
							<p class="text-xs text-[var(--muted)]">UA: {request.ua_hash}</p>
						</div>
						<div class="text-xs text-[var(--muted)]">{request.status}</div>
					</div>
					{#if request.message}
						<p class="mt-2 text-sm text-[var(--muted)]">{request.message}</p>
					{/if}
					{#if request.status === 'pending'}
						<div class="mt-3 flex gap-2">
							<form method="post">
								<input type="hidden" name="id" value={request.id} />
								<button
									class="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
									formaction="?/approve"
									type="submit"
								>
									Approve
								</button>
							</form>
							<form method="post">
								<input type="hidden" name="id" value={request.id} />
								<button
									class="rounded-md border border-[var(--line)] px-3 py-1 text-xs"
									formaction="?/deny"
									type="submit"
								>
									Deny
								</button>
							</form>
						</div>
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
