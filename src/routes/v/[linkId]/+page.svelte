<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
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

	$effect(() => {
		console.log('Viewer page received data:', data);
	});
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
			<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
				<h1 class="text-xl font-semibold">Link inactive</h1>
				<p class="mt-2 text-sm text-[var(--muted)]">This link has been disabled.</p>
			</div>
		{:else if data.status === 'locked'}
			<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
				<h1 class="text-xl font-semibold">{data.name}</h1>
				<p class="mt-2 text-sm text-[var(--muted)]">
					Enter the one-time password to unlock this link on your device.
				</p>
				<form class="mt-6 grid max-w-sm gap-3" method="post" use:submitBusy>
					<label class="grid gap-2 text-sm">
						<span>Password</span>
						<input
							class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
							type="password"
							name="password"
							required
						/>
					</label>
					{#if form?.error}
						<p class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{form.error}
						</p>
					{/if}
					<button
						class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
						formaction="?/login"
						type="submit"
					>
						Unlock
					</button>
				</form>
			</div>

			<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
				<h2 class="text-lg font-semibold">Request access</h2>
				<p class="mt-2 text-sm text-[var(--muted)]">
					If you cannot access this device, send a request to the admin.
				</p>
				<form class="mt-4 grid max-w-sm gap-3" method="post" use:submitBusy>
					<label class="grid gap-2 text-sm">
						<span>Message</span>
						<textarea
							class="min-h-[120px] rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
							name="message"
							placeholder="Tell the admin who you are..."
						></textarea>
					</label>
					<button
						class="rounded-md border border-[var(--line)] px-4 py-2 text-sm"
						formaction="?/request"
						type="submit"
					>
						Send request
					</button>
				</form>
			</div>
		{:else if data.status === 'ok'}
			<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
				<h1 class="text-xl font-semibold">{data.name}</h1>
				{#if data.updateMessage && data.updateMessage.trim()}
					<p class="mt-2 text-sm text-[var(--muted)]">Updated: {data.updateMessage}</p>
				{/if}
			</div>
			<div class="overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]">
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
