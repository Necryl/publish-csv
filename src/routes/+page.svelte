<svelte:head>
	<title>Publish CSV</title>
</svelte:head>

<div class="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
		<header class="card">
			<p class="text-xs tracking-[0.3em] text-[var(--muted)] uppercase">Encrypted CSV</p>
			<h1 class="mt-4 text-2xl font-semibold sm:text-3xl">
				Publish secure views of sensitive CSV data
			</h1>
			<p class="mt-3 text-sm text-[var(--muted)]">
				Upload a CSV, define filters, and share device-bound links with one-time passwords.
			</p>
			<a class="btn-primary mt-8" href="/admin"> Open admin console </a>
		</header>

		<section class="grid gap-4 md:grid-cols-3">
			<div class="card">
				<h2 class="text-sm font-semibold">Encrypted storage</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					CSV files are encrypted before upload and decrypted only on the server.
				</p>
			</div>
			<div class="card">
				<h2 class="text-sm font-semibold">Device binding</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					One-time passwords unlock the link for a single device session.
				</p>
			</div>
			<div class="card">
				<h2 class="text-sm font-semibold">Admin control</h2>
				<p class="mt-2 text-xs text-[var(--muted)]">
					Approve recovery requests and deactivate links at any time.
				</p>
			</div>
		</section>
	</div>
</div>
