<script lang="ts">
	import { appConfig } from '$lib/config/app';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';

	const session = $derived(page.data.auth?.session);
</script>

<svelte:head>
	<title>{appConfig.name} — {appConfig.landing.title}</title>
</svelte:head>

<main class="landing">
	<div class="hero">
		<div class="badge">{appConfig.landing.badge}</div>
		<h1>{appConfig.landing.title}</h1>
		<p class="lead">{appConfig.landing.description}</p>
		<div class="actions">
			<Button size="lg" onclick={() => goto('/app')}>Open diagram</Button>
			{#if session}
				<span class="signed-in">Signed in as {session.email ?? session.subject}</span>
				<form method="POST" action="/auth/logout">
					<Button variant="outline" size="lg" type="submit">Sign out</Button>
				</form>
			{:else}
				<Button variant="outline" size="lg" href="/auth/login" data-sveltekit-reload>
					Sign in with MANEF
				</Button>
			{/if}
		</div>
	</div>

	<section class="cards">
		<div class="card">
			<h2>Interactive graph</h2>
			<p>Drag nodes, trace connections, and edit the MANEF service architecture.</p>
		</div>
		<div class="card">
			<h2>Portable core</h2>
			<p>Framework-neutral TypeScript graph core, reusable across MANEF products.</p>
		</div>
		<div class="card">
			<h2>MCP-ready</h2>
			<p>Query the graph over an authenticated MCP endpoint for agents and clients.</p>
		</div>
	</section>
</main>

<style>
	.landing {
		display: grid;
		place-items: center;
		min-height: 100dvh;
		gap: 3rem;
		padding: 2rem;
		background: var(--background);
		color: var(--foreground);
	}
	.hero {
		display: grid;
		gap: 1.25rem;
		max-width: 44rem;
		text-align: center;
	}
	.badge {
		justify-self: center;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--muted);
		padding: 0.35rem 0.9rem;
		font-size: 0.78rem;
		color: var(--muted-foreground);
	}
	h1 {
		margin: 0;
		font-size: clamp(2rem, 5vw, 3.2rem);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.lead {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 1.05rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
	}
	.signed-in {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
		width: 100%;
		max-width: 52rem;
	}
	.card {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		padding: 1.25rem;
	}
	.card h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	.card p {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.88rem;
	}
</style>
