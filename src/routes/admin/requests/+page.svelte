<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
	let selectedLinkId = $state<string>('');

	let filteredRequests = $derived(
		selectedLinkId === ''
			? data.requests
			: data.requests.filter((req) => req.link_id === selectedLinkId)
	);
</script>

<section class="card">
	<h1 class="text-xl font-semibold">Recovery requests</h1>
	{#if data.links?.length > 0}
		<div class="mt-4 grid gap-2 sm:max-w-xs">
			<label for="link-filter-requests" class="text-sm font-semibold">Filter by link</label>
			<select
				id="link-filter-requests"
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
	{#if !filteredRequests.length}
		<p class="mt-4 text-sm text-[var(--muted)]">
			{data.requests.length === 0 ? 'No requests yet.' : 'No requests for selected link.'}
		</p>
	{:else}
		<div class="mt-4 grid gap-3">
			{#each filteredRequests as request (request.id)}
				<div
					class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition-all hover:shadow-md sm:p-5"
				>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p class="text-sm font-semibold">{request.linkName}</p>
							<p class="text-xs text-[var(--muted)]">Link {request.link_id}</p>
						</div>
						{#if request.status === 'pending'}
							<span class="badge badge-warning">Pending</span>
						{:else if request.status === 'approved'}
							<span class="badge badge-success">Approved</span>
						{:else}
							<span class="badge">Denied</span>
						{/if}
					</div>
					<p class="mt-2 text-xs text-[var(--muted)]">UA: {request.ua_hash}</p>
					{#if request.message}
						<p class="mt-2 text-sm text-[var(--muted)]">{request.message}</p>
					{/if}
					{#if request.status === 'pending'}
						<div class="mt-3 flex flex-wrap gap-2">
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={request.id} />
								<button class="btn-primary text-xs" formaction="?/approve" type="submit">
									Approve
								</button>
							</form>
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={request.id} />
								<button class="btn-secondary text-xs" formaction="?/deny" type="submit">
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
		<div class="alert alert-error mt-4">
			<span>{form.error}</span>
		</div>
	{/if}
</section>
