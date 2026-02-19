<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
</script>

<section class="grid gap-6">
	<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
		<h1 class="text-xl font-semibold">CSV File</h1>
		<p class="mt-2 text-sm text-[var(--muted)]">
			Upload a new CSV file. Manage which file is active using the file list below.
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
			<label class="grid gap-2 text-sm">
				<span>Update message <span class="text-[var(--muted)]">(optional)</span></span>
				<input
					class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
					type="text"
					name="updateMessage"
					placeholder="e.g., Fixed data, Added new columns..."
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

	{#if data.allFiles && data.allFiles.length > 0}
		<div class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-6">
			<h2 class="text-lg font-semibold">All files</h2>
			<div class="mt-4 space-y-4">
				{#each data.allFiles as file (file.id)}
					<div class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold break-all">{file.filename}</p>
								<div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
									<span>{file.row_count} rows</span>
									<span>•</span>
									<span
										>{file.uploaded_at
											? new Date(file.uploaded_at).toLocaleString()
											: 'Unknown date'}</span
									>
									{#if data.current?.id === file.id}
										<span
											class="ml-1 inline-block rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-white"
											>Active</span
										>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if data.current?.id !== file.id}
									<form method="post" action="?/setActive" use:submitBusy>
										<input type="hidden" name="fileId" value={file.id} />
										<button
											class="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium whitespace-nowrap hover:bg-[var(--surface-2)]"
											type="submit"
										>
											Activate
										</button>
									</form>
								{/if}
								<form method="post" action="?/delete" use:submitBusy>
									<input type="hidden" name="fileId" value={file.id} />
									<button
										class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium whitespace-nowrap text-red-600 hover:bg-red-100"
										type="submit"
										onclick={(e) => {
											if (!confirm('Delete this file? This cannot be undone.')) e.preventDefault();
										}}
									>
										Delete
									</button>
								</form>
							</div>
						</div>
						<form class="mt-4 flex items-end gap-2" method="post" use:submitBusy>
							<input type="hidden" name="fileId" value={file.id} />
							<label class="grid flex-1 gap-2 text-sm">
								<span class="font-medium">Update message</span>
								<input
									class="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm"
									type="text"
									name="message"
									value={file.update_message || ''}
									placeholder="Message for viewers..."
								/>
							</label>
							<button
								class="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-[var(--surface-2)]"
								formaction="?/updateMessage"
								type="submit"
							>
								Save
							</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
