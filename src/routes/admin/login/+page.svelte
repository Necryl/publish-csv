<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { form } = $props();
</script>

<div class="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
	<div class="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10 sm:px-6 sm:py-12">
		<div
			class="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 shadow-lg sm:p-8"
		>
			<h1 class="text-2xl font-semibold">Admin Sign In</h1>
			<p class="mt-2 text-sm text-[var(--muted)]">
				Single-session login. Any other admin session is revoked.
			</p>

			<form class="mt-6 grid gap-4" method="post" use:submitBusy>
				<label class="grid gap-2 text-sm">
					<span>Email</span>
					<input
						class="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
						type="email"
						name="email"
						required
					/>
				</label>
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
					class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
					type="submit"
				>
					Sign in
				</button>
			</form>
		</div>
	</div>
</div>
