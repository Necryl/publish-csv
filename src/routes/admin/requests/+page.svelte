<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
	let selectedLinkId = $state<string>('');
	let searchText = $state<string>('');
	let showSearchDropdown = $state<boolean>(false);

	let filteredRequests = $derived(
		selectedLinkId === ''
			? data.requests
			: data.requests.filter((req) => req.link_id === selectedLinkId)
	);

	let filteredLinks = $derived(
		searchText === ''
			? data.links
			: data.links.filter((link) => link.name.toLowerCase().includes(searchText.toLowerCase()))
	);

	const selectLink = (linkId: string, linkName: string) => {
		selectedLinkId = linkId;
		searchText = linkName;
		showSearchDropdown = false;
	};

	const clearFilter = () => {
		selectedLinkId = '';
		searchText = '';
		showSearchDropdown = false;
	};
</script>

<section class="card">
	<h1 class="text-xl font-semibold">Recovery requests</h1>
	{#if data.links?.length > 0}
		<div class="mt-4 grid gap-2 sm:max-w-xs">
			<label for="link-search-requests" class="text-sm font-semibold">Filter by link</label>
			<div class="relative">
				<input
					id="link-search-requests"
					type="text"
					placeholder="Search links..."
					value={searchText}
					onchange={(e) => (searchText = e.currentTarget.value)}
					oninput={(e) => {
						searchText = e.currentTarget.value;
						showSearchDropdown = true;
					}}
					onfocus={() => (showSearchDropdown = true)}
					class="w-full rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
				/>
				{#if selectedLinkId && searchText}
					<button
						type="button"
						onclick={clearFilter}
						class="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
					>
						✕
					</button>
				{/if}
				{#if showSearchDropdown && searchText && filteredLinks.length > 0}
					<div
						class="absolute top-full right-0 left-0 z-10 mt-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] shadow-lg"
					>
						{#each filteredLinks as link (link.id)}
							<button
								type="button"
								onclick={() => selectLink(link.id, link.name)}
								class="w-full border-b border-[var(--line)] px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-[var(--surface)]"
							>
								{link.name}
							</button>
						{/each}
					</div>
				{/if}
			</div>
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
