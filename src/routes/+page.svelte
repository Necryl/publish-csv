<svelte:head>
	<title>Publish CSV</title>
</svelte:head>

<div class="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
		<header class="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 sm:p-8">
			<p class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Encrypted CSV</p>
			<h1 class="mt-4 text-2xl font-semibold sm:text-3xl">
				Publish secure views of sensitive CSV data
			</h1>
			<p class="mt-3 text-sm text-[var(--muted)]">
				Upload a CSV, define filters, and share device-bound links with one-time passwords.
			</p>
			<a
				class="mt-6 inline-flex w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
				href="/admin"
			>
				Open admin console
			</a>
		</header>

		<section class="grid gap-4 md:grid-cols-3">
			<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5">
				<h2 class="text-sm font-semibold">Encrypted storage</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					CSV files are encrypted before upload and decrypted only on the server.
				</p>
			</div>
			<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5">
				<h2 class="text-sm font-semibold">Device binding</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					One-time passwords unlock the link for a single device session.
				</p>
			</div>
			<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5">
				<h2 class="text-sm font-semibold">Admin control</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					Approve recovery requests and deactivate links at any time.
				</p>
			</div>
		</section>
	</div>
</div>
