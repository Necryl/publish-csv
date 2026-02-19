<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { data, form } = $props();
</script>

<section class="grid gap-6">
	<div class="card">
		<h1 class="text-xl font-semibold">CSV File</h1>
		<p class="mt-2 text-sm text-[var(--muted)]">
			Upload a new CSV file. Manage which file is active using the file list below.
		</p>

		<form class="mt-6 grid gap-4" method="post" enctype="multipart/form-data" use:submitBusy>
			<label class="form-group">
				<span class="font-medium">CSV file</span>
				<input type="file" name="file" accept=".csv,text/csv" required />
			</label>
			<label class="form-group">
				<span class="font-medium"
					>Update message <span class="text-[var(--muted)]">(optional)</span></span
				>
				<input
					type="text"
					name="updateMessage"
					maxlength="500"
					placeholder="e.g., Fixed data, Added new columns..."
				/>
			</label>
			{#if form?.error}
				<div class="alert alert-error">
					<span>{form.error}</span>
				</div>
			{/if}
			<button class="btn-primary" formaction="?/upload" type="submit"> Upload </button>
		</form>
	</div>

	{#if data.allFiles && data.allFiles.length > 0}
		<div class="card">
			<h2 class="text-lg font-semibold">All files</h2>
			<div class="mt-4 space-y-4">
				{#each data.allFiles as file (file.id)}
					<div
						class="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition-all hover:shadow-md"
					>
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
										<span class="badge badge-primary">Active</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if data.current?.id !== file.id}
									<form method="post" action="?/setActive" use:submitBusy>
										<input type="hidden" name="fileId" value={file.id} />
										<button class="btn-secondary text-xs" type="submit"> Activate </button>
									</form>
								{/if}
								<form method="post" action="?/delete" use:submitBusy>
									<input type="hidden" name="fileId" value={file.id} />
									<button
										class="btn-danger text-xs"
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
							<label class="form-group flex-1">
								<span class="text-sm font-medium">Update message</span>
								<input
									type="text"
									name="message"
									value={file.update_message || ''}
									maxlength="500"
									placeholder="Message for viewers..."
								/>
							</label>
							<button class="btn-secondary text-xs" formaction="?/updateMessage" type="submit">
								Save
							</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
