<script lang="ts">
	import type { CsvCriteria, CsvColumnType } from '$lib/server/csv';

	let { data, form } = $props();
	let columns = $derived(data.current?.schema?.columns ?? []);

	let criteria = $state<CsvCriteria[]>([]);
	let criteriaJson = $derived(JSON.stringify(criteria));

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

	const addRule = () => {
		criteria = [...criteria, { column: columns[0]?.name ?? '', op: 'eq', value: '' }];
	};

	const removeRule = (index: number) => {
		criteria = criteria.filter((_, idx) => idx !== index);
	};

	const updateRule = (index: number, key: keyof CsvCriteria, value: string) => {
		criteria = criteria.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule));
	};
</script>

<section class="grid gap-6">
	<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
		<h1 class="text-xl font-semibold">Create link</h1>
		{#if !columns.length}
			<p class="mt-2 text-sm text-[var(--muted)]">Upload a CSV before creating links.</p>
		{:else}
			<form class="mt-4 grid gap-4" method="post">
				<label class="grid gap-2 text-sm">
					<span>Label</span>
					<input
						class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
						name="name"
						required
					/>
				</label>
				<label class="grid gap-2 text-sm">
					<span>Password (one-time)</span>
					<input
						class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
						type="text"
						name="password"
						required
					/>
				</label>

				<div class="grid gap-3">
					<p class="text-sm font-semibold">Filters</p>
					{#each criteria as rule, index (index)}
						<div
							class="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
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
					<p class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
						{form.error}
					</p>
				{/if}
				<button
					class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
					formaction="?/create"
					type="submit"
				>
					Create link
				</button>
			</form>
		{/if}
	</div>

	<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
		<h2 class="text-lg font-semibold">Existing links</h2>
		{#if !data.links.length}
			<p class="mt-2 text-sm text-[var(--muted)]">No links yet.</p>
		{:else}
			<div class="mt-4 grid gap-3">
				{#each data.links as link (link.id)}
					<div class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="text-sm font-semibold">{link.name}</p>
								<p class="text-xs text-[var(--muted)]">{link.id}</p>
							</div>
							<div class="text-xs text-[var(--muted)]">
								{link.active ? 'Active' : 'Disabled'}
							</div>
						</div>
						<p class="mt-2 text-xs text-[var(--muted)]">
							Link: {data.baseUrl}{link.id}
						</p>
						<form class="mt-3" method="post">
							<input type="hidden" name="id" value={link.id} />
							<button
								class="rounded-md border border-[var(--line)] px-3 py-1 text-xs hover:text-[var(--accent)]"
								formaction={link.active ? '?/deactivate' : '?/activate'}
								type="submit"
							>
								{link.active ? 'Deactivate' : 'Activate'}
							</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
