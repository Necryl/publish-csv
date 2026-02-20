<script lang="ts">
	import { onMount } from 'svelte';
	import { submitBusy } from '$lib/submit-busy';
	import type { CsvCriteria, CsvColumnType } from '$lib/server/csv';

	let { data, form } = $props();
	let columns = $derived(data.current?.schema?.columns ?? []);

	let shareTemplate = $state('');

	$effect(() => {
		shareTemplate = data.shareTemplate ?? '';
	});

	let criteria = $state<CsvCriteria[]>([]);
	let criteriaJson = $derived(JSON.stringify(criteria));
	let showSerialDefault = $state(false);
	let hideFirstColumnDefault = $state(false);

	// Search, filter, and sort state
	let searchTerm = $state('');
	let statusFilter = $state<'all' | 'active' | 'disabled'>('all');
	let sortBy = $state<'name' | 'created' | 'status'>('created');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	// Filtered and sorted links
	let filteredLinks = $derived.by(() => {
		let result = [...data.links];

		// Apply search filter
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			result = result.filter(
				(link) =>
					link.name.toLowerCase().includes(term) || link.id.toLowerCase().includes(term)
			);
		}

		// Apply status filter
		if (statusFilter === 'active') {
			result = result.filter((link) => link.active);
		} else if (statusFilter === 'disabled') {
			result = result.filter((link) => !link.active);
		}

		// Apply sorting
		result.sort((a, b) => {
			let comparison = 0;
			if (sortBy === 'name') {
				comparison = a.name.localeCompare(b.name);
			} else if (sortBy === 'status') {
				comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0);
			} else if (sortBy === 'created') {
				comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			}
			return sortOrder === 'asc' ? comparison : -comparison;
		});

		return result;
	});

	const operators: Record<CsvColumnType, { label: string; value: CsvCriteria['op'] }[]> = {
		string: [
			{ label: 'equals', value: 'eq' },
			{ label: 'contains', value: 'contains' }
		],
		number: [
			{ label: 'equals', value: 'eq' },
			{ label: 'greater than', value: 'gt' },
			{ label: 'greater/equal', value: 'gte' },
			{ label: 'less than', value: 'lt' },
			{ label: 'less/equal', value: 'lte' }
		],
		date: [
			{ label: 'on', value: 'eq' },
			{ label: 'after', value: 'gt' },
			{ label: 'on/after', value: 'gte' },
			{ label: 'before', value: 'lt' },
			{ label: 'on/before', value: 'lte' }
		]
	};

	const columnType = (name: string) =>
		columns.find((column: { name: string }) => column.name === name)?.type ?? 'string';

	const isCaseSensitiveApplicable = (column: string, op: CsvCriteria['op']) => {
		const type = columnType(column);
		return type === 'string' && (op === 'eq' || op === 'contains');
	};

	const addRule = () => {
		criteria = [
			...criteria,
			{ column: columns[0]?.name ?? '', op: 'eq', value: '', caseSensitive: false }
		];
	};

	const removeRule = (index: number) => {
		criteria = criteria.filter((_, idx) => idx !== index);
	};

	const updateRule = (index: number, key: keyof CsvCriteria, value: string | boolean) => {
		criteria = criteria.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule));
	};

	const copyLink = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// Clipboard may be blocked; fallback to prompt.
			window.prompt('Copy link:', url);
		}
	};

	const copyShareMessage = async (url: string) => {
		const message = shareTemplate.replace(/\{LINK\}/g, url);
		try {
			await navigator.clipboard.writeText(message);
		} catch {
			// Clipboard may be blocked; fallback to prompt.
			window.prompt('Copy message:', message);
		}
	};

	const storageKey = 'publishCsv:linkOptions';
	const sortStorageKey = 'publishCsv:linkListSort';

	onMount(() => {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as { showSerial?: boolean; hideFirstColumn?: boolean };
			showSerialDefault = !!parsed.showSerial;
			hideFirstColumnDefault = !!parsed.hideFirstColumn;
		} catch {
			return;
		}

		// Load sort preferences
		const sortRaw = window.localStorage.getItem(sortStorageKey);
		if (!sortRaw) return;
		try {
			const sortParsed = JSON.parse(sortRaw) as { sortBy?: string; sortOrder?: string };
			if (sortParsed.sortBy === 'name' || sortParsed.sortBy === 'created' || sortParsed.sortBy === 'status') {
				sortBy = sortParsed.sortBy;
			}
			if (sortParsed.sortOrder === 'asc' || sortParsed.sortOrder === 'desc') {
				sortOrder = sortParsed.sortOrder;
			}
		} catch {
			return;
		}
	});

	const persistDefaults = () => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(
			storageKey,
			JSON.stringify({ showSerial: showSerialDefault, hideFirstColumn: hideFirstColumnDefault })
		);
	};

	const persistSortPreferences = () => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(
			sortStorageKey,
			JSON.stringify({ sortBy, sortOrder })
		);
	};

	const confirmDelete = (event: MouseEvent) => {
		if (!window.confirm('Delete this link? This cannot be undone.')) {
			event.preventDefault();
		}
	};
</script>

<section class="grid gap-6">
	<div class="card">
		<h1 class="text-xl font-semibold">Create link</h1>
		{#if !columns.length}
			<p class="mt-2 text-sm text-[var(--muted)]">Upload a CSV before creating links.</p>
		{:else}
			<form class="mt-4 grid gap-4" method="post" use:submitBusy>
				<label class="form-group">
					<span class="font-medium">Label</span>
					<input name="name" required />
				</label>
				<label class="form-group">
					<span class="font-medium">Password (one-time)</span>
					<input type="text" name="password" required />
				</label>

				<div class="grid gap-2 text-sm">
					<p class="font-semibold">Viewer options</p>
					<label class="flex items-center gap-2">
						<input
							class="rounded border border-[var(--line)]"
							type="checkbox"
							name="showSerial"
							bind:checked={showSerialDefault}
							onchange={persistDefaults}
						/>
						<span>Add serial number column</span>
					</label>
					<label class="flex items-center gap-2">
						<input
							class="rounded border border-[var(--line)]"
							type="checkbox"
							name="hideFirstColumn"
							bind:checked={hideFirstColumnDefault}
							onchange={persistDefaults}
						/>
						<span>Hide first CSV column</span>
					</label>
				</div>

				<div class="grid gap-3">
					<p class="text-sm font-semibold">Filters</p>
					{#each criteria as rule, index (index)}
						<div
							class="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]"
						>
							<select
								class="rounded-md border border-[var(--line)] bg-transparent px-2 py-2 text-sm"
								value={rule.column}
								onchange={(event) => updateRule(index, 'column', event.currentTarget.value)}
							>
								{#each columns as column (column.name)}
									<option value={column.name}>{column.name}</option>
								{/each}
							</select>
							<select
								class="rounded-md border border-[var(--line)] bg-transparent px-2 py-2 text-sm"
								value={rule.op}
								onchange={(event) => updateRule(index, 'op', event.currentTarget.value)}
							>
								{#each operators[columnType(rule.column)] as op (op.value)}
									<option value={op.value}>{op.label}</option>
								{/each}
							</select>
							<input
								class="rounded-md border border-[var(--line)] bg-transparent px-2 py-2 text-sm"
								placeholder="Value"
								value={rule.value}
								oninput={(event) => updateRule(index, 'value', event.currentTarget.value)}
							/>
							<label
								class="flex items-center gap-2 px-2 py-2 text-xs"
								class:text-[var(--muted)]={!isCaseSensitiveApplicable(rule.column, rule.op)}
								class:opacity-50={!isCaseSensitiveApplicable(rule.column, rule.op)}
							>
								<input
									class="rounded border border-[var(--line)]"
									type="checkbox"
									disabled={!isCaseSensitiveApplicable(rule.column, rule.op)}
									checked={rule.caseSensitive ?? false}
									onchange={(event) =>
										updateRule(index, 'caseSensitive', event.currentTarget.checked)}
								/>
								<span>Case sensitive</span>
							</label>
							<button
								class="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
								type="button"
								onclick={() => removeRule(index)}
							>
								Remove
							</button>
						</div>
					{/each}
					<button
						class="w-fit rounded-md border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
						type="button"
						onclick={addRule}
					>
						Add filter
					</button>
				</div>

				<input type="hidden" name="criteria" value={criteriaJson} />
				{#if form?.error}
					<div class="alert alert-error">
						<span>{form.error}</span>
					</div>
				{/if}
				<button class="btn-primary" formaction="?/create" type="submit"> Create link </button>
			</form>
		{/if}
	</div>

	<div class="card">
		<h2 class="text-lg font-semibold">Existing links</h2>
		{#if !data.links.length}
			<p class="mt-2 text-sm text-[var(--muted)]">No links yet.</p>
		{:else}
			<!-- Share Message Template -->
			<div class="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
				<form class="grid gap-3" method="post" use:submitBusy>
					<label class="form-group">
						<span class="text-sm font-medium">Share Message Template</span>
						<textarea
							name="template"
							bind:value={shareTemplate}
							class="rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-sm font-mono"
							rows="4"
							placeholder="Enter your share message template.&#10;Use {'\u007b'}LINK{'\u007d'} as a placeholder for the link URL.&#10;Example: Check out this data: {'\u007b'}LINK{'\u007d'}"
						></textarea>
					</label>
					<p class="text-xs text-[var(--muted)]">
						Use <code class="rounded bg-[var(--line)] px-1 py-0.5">{'{LINK}'}</code> as a placeholder for the link URL.
					</p>
					<button class="btn-primary w-fit" formaction="?/updateShareTemplate" type="submit">
						Save Template
					</button>
				</form>
			</div>

			<!-- Search, Filter, and Sort Controls -->
			<div class="mt-4 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-2 lg:grid-cols-4">
				<label class="form-group">
					<span class="text-xs font-medium">Search</span>
					<input
						type="text"
						placeholder="Search by name or ID..."
						class="rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
						bind:value={searchTerm}
					/>
				</label>
				<label class="form-group">
					<span class="text-xs font-medium">Status</span>
					<select
						class="rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
						bind:value={statusFilter}
					>
						<option value="all">All</option>
						<option value="active">Active only</option>
						<option value="disabled">Disabled only</option>
					</select>
				</label>
				<label class="form-group">
					<span class="text-xs font-medium">Sort by</span>
					<select
						class="rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
						bind:value={sortBy}
						onchange={persistSortPreferences}
					>
						<option value="created">Created date</option>
						<option value="name">Name</option>
						<option value="status">Status</option>
					</select>
				</label>
				<label class="form-group">
					<span class="text-xs font-medium">Order</span>
					<select
						class="rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
						bind:value={sortOrder}
						onchange={persistSortPreferences}
					>
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>
				</label>
			</div>

			<!-- Results count -->
			<p class="mt-3 text-xs text-[var(--muted)]">
				Showing {filteredLinks.length} of {data.links.length} links
			</p>

			{#if filteredLinks.length === 0}
				<div class="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
					<p class="text-sm text-[var(--muted)]">No links match your search criteria.</p>
				</div>
			{:else}
				<div class="mt-4 grid gap-3">
					{#each filteredLinks as link (link.id)}
					<div
						class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition-all hover:shadow-md sm:p-5"
					>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<form class="flex flex-wrap items-center gap-2" method="post" use:submitBusy>
								<input type="hidden" name="id" value={link.id} />
								<input
									class="w-full rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-sm font-semibold sm:w-auto"
									name="name"
									value={link.name}
								/>
								<button class="btn-secondary text-xs" formaction="?/rename" type="submit">
									Save
								</button>
							</form>
							{#if link.active}
								<span class="badge badge-success">Active</span>
							{:else}
								<span class="badge">Disabled</span>
							{/if}
						</div>
						<p class="mt-2 text-xs break-all text-[var(--muted)]">{link.id}</p>
						{#if link.criteria && link.criteria.length > 0}
							<p class="mt-2 text-xs text-[var(--muted)]">
								<span class="font-medium">Filters:</span>
								{#each link.criteria as criterion, idx}
									<span>
										{criterion.column}
										{criterion.op === 'eq' ? '=' : criterion.op} "{criterion.value}"
										{#if (criterion.op === 'eq' || criterion.op === 'contains') && criterion.column && columnType(criterion.column) === 'string'}
											{criterion.caseSensitive ? ' (case sensitive)' : ' (case insensitive)'}
										{/if}
										{idx < link.criteria.length - 1 ? ',' : ''}
									</span>
									<br />
								{/each}
							</p>
						{:else}
							<p class="mt-2 text-xs text-[var(--muted)]">
								<span class="font-medium">Filters:</span> None
							</p>
						{/if}
						<div class="mt-3 flex flex-wrap items-start gap-2 sm:items-center">
							<a
								href={`${data.baseUrl}${link.id}`}
								target="_blank"
								rel="noopener noreferrer"
								class="text-xs break-all text-[var(--accent)] hover:underline"
							>
								Link: {data.baseUrl}{link.id}
							</a>
							<button
								class="btn-secondary text-xs"
								onclick={() => copyLink(`${data.baseUrl}${link.id}`)}
								type="button"
							>
								Copy
							</button>						{#if shareTemplate}
							<button
								class="btn-secondary text-xs"
								onclick={() => copyShareMessage(`${data.baseUrl}${link.id}`)}
								type="button"
							>
								Share
							</button>
						{/if}							<form class="flex flex-wrap items-center gap-2" method="post" use:submitBusy>
								<input type="hidden" name="id" value={link.id} />
								<label class="flex items-center gap-1 text-xs text-[var(--muted)]">
									<input
										class="rounded border border-[var(--line)]"
										type="checkbox"
										name="showSerial"
										checked={link.display_options?.showSerial ?? false}
									/>
									<span>Serial</span>
								</label>
								<label class="flex items-center gap-1 text-xs text-[var(--muted)]">
									<input
										class="rounded border border-[var(--line)]"
										type="checkbox"
										name="hideFirstColumn"
										checked={link.display_options?.hideFirstColumn ?? false}
									/>
									<span>Hide first</span>
								</label>
								<button class="btn-secondary text-xs" formaction="?/updateOptions" type="submit">
									Update
								</button>
							</form>
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={link.id} />
								<button
									class="btn-secondary text-xs"
									formaction={link.active ? '?/deactivate' : '?/activate'}
									type="submit"
								>
									{link.active ? 'Deactivate' : 'Activate'}
								</button>
							</form>
							<form method="post" use:submitBusy>
								<input type="hidden" name="id" value={link.id} />
								<button
									class="btn-danger text-xs"
									formaction="?/delete"
									type="submit"
									onclick={confirmDelete}
								>
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
			{/if}
		{/if}
	</div>
</section>
