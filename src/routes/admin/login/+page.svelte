<script lang="ts">
	import { submitBusy } from '$lib/submit-busy';
	let { form } = $props();
</script>

<div class="flex flex-1 flex-col items-center justify-center px-4">
	<div class="w-full max-w-lg">
		<div class="card w-full shadow-lg">
			<h1 class="text-2xl font-semibold">Admin Sign In</h1>
			<p class="mt-2 text-sm text-[var(--muted)]">
				Single-session login. Any other admin session is revoked.
			</p>

			<form class="mt-6 grid gap-4" method="post" use:submitBusy>
				<label class="form-group">
					<span class="font-medium">Email</span>
					<input type="email" name="email" required />
				</label>
				<label class="form-group">
					<span class="font-medium">Password</span>
					<input type="password" name="password" required />
				</label>
				{#if form?.error}
					<div class="alert alert-error">
						<span>{form.error}</span>
					</div>
				{/if}
				<button class="btn-primary" type="submit"> Sign in </button>
			</form>
		</div>
	</div>
</div>
