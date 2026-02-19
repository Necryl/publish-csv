<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
</script>

<section class="grid gap-6">
	<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
		<h1 class="text-xl font-semibold">CSV File</h1>
		<p class="mt-2 text-sm text-[var(--muted)]">
			Upload a CSV to replace the current encrypted file. Existing links will point to the new file.
		</p>

		<form class="mt-6 grid gap-4" method="post" enctype="multipart/form-data" use:submitBusy>
			<label class="grid gap-2 text-sm">
				<span>CSV file</span>
				<input
					class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
					type="file"
					name="file"
					accept=".csv,text/csv"
					required
				/>
			</label>
			{#if form?.error}
				<p class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
					{form.error}
				</p>
			{/if}
			<button
				class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
				formaction="?/upload"
				type="submit"
			>
				Upload
			</button>
		</form>
	</div>

	{#if data.current}
		<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
			<h2 class="text-lg font-semibold">Current file</h2>
			<p class="mt-2 text-sm text-[var(--muted)]">{data.current.filename}</p>
			<p class="mt-1 text-sm text-[var(--muted)]">{data.current.row_count} rows</p>
		</div>
	{/if}
</section>
