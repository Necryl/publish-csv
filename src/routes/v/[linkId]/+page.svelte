<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	import NotificationToggle from '$lib/NotificationToggle.svelte';
	let { data, form } = $props();
	let rows = $derived(data.rows ?? []);
	let columns = $derived(data.columns ?? []);
	let pageTitle = $derived.by(() => {
		if (data.status === 'ok') return `${data.name} - Publish CSV`;
		if (data.status === 'locked') return `${data.name} - Unlock`;
		return 'Link inactive - Publish CSV';
	});
	let pageDescription = $derived.by(() => {
		if (data.status === 'ok') return 'Secure CSV view. Filtered rows only.';
		if (data.status === 'locked') return 'Enter the one-time password to unlock this link.';
		return 'This link is inactive.';
	});

	$effect(() => {});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
		{#if data.status === 'inactive'}
			<div class="card">
				<h1 class="text-xl font-semibold">Link inactive</h1>
				<p class="mt-2 text-sm text-[var(--muted)]">This link has been disabled.</p>
			</div>
		{:else if data.status === 'locked'}
			<div class="card">
				<h1 class="text-xl font-semibold">{data.name}</h1>
				<p class="mt-2 text-sm text-[var(--muted)]">
					Enter the one-time password to unlock this link on your device.
				</p>
				<form class="mt-6 grid gap-3" method="post" use:submitBusy>
					<label class="form-group min-w-0">
						<span>Password</span>
						<input class="min-w-0" type="password" name="password" required />
					</label>
					{#if form?.error}
						<div class="alert alert-error">
							<span>{form.error}</span>
						</div>
					{/if}
					<button class="btn-primary w-full min-w-0" formaction="?/login" type="submit">
						Unlock
					</button>
				</form>
			</div>

			<div class="card">
				<h2 class="text-lg font-semibold">Request access</h2>
				<p class="mt-2 text-sm text-[var(--muted)]">
					If you cannot access this device, send a request to the admin.
				</p>
				<form class="mt-4 grid gap-3" method="post" use:submitBusy>
					<label class="form-group min-w-0">
						<span>Message</span>
						<textarea
							class="min-h-[120px] min-w-0"
							name="message"
							placeholder="Tell the admin who you are..."
						></textarea>
					</label>
					<button class="btn-secondary w-full min-w-0" formaction="?/request" type="submit">
						Send request
					</button>
				</form>
			</div>
		{:else if data.status === 'ok'}
			<div class="card">
				<div class="flex items-start justify-between">
					<div>
						<h1 class="text-xl font-semibold">{data.name}</h1>
						{#if data.updateMessage && data.updateMessage.trim()}
							<p class="mt-2 text-sm text-[var(--muted)]">Updated: {data.updateMessage}</p>
						{/if}
					</div>
					<NotificationToggle type="viewer" linkId={data.linkId} />
				</div>
			</div>
			<div class="overflow-auto rounded-lg border border-[var(--line)] bg-[var(--surface-2)]">
				<table class="min-w-full text-left text-xs sm:text-sm">
					<thead class="bg-[var(--surface)] text-xs tracking-[0.2em] text-[var(--muted)] uppercase">
						<tr>
							{#each columns as column (column.name)}
								<th class="px-4 py-3">{column.name}</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--line)]">
						{#each rows as row, rowIndex (rowIndex)}
							<tr>
								{#each columns as column (column.name)}
									<td class="px-4 py-3 text-[var(--muted)]">{row[column.name]}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
