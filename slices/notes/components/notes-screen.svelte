<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import NotesEditor from './notes-editor.svelte';
</script>

<div class="space-y-5">
	<Card.Root>
		<Card.Header>
			<Card.Title>Private notes</Card.Title>
			<Card.Description>Save a draft, revise it, or remove it from your account.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if !page.data.auth.enabled}
				<p class="text-sm text-muted-foreground">
					Sign-in is not configured. Enable Google sign-in and connect a Convex deployment to use
					this example.
				</p>
			{:else if !page.data.auth.session}
				<p class="text-sm text-muted-foreground">Sign in with Google to open your notes.</p>
				<Button href="/auth/login" data-sveltekit-reload>Sign in with Google</Button>
			{:else}
				<p class="text-sm text-muted-foreground">
					Signed in{page.data.auth.session.email ? ` as ${page.data.auth.session.email}` : ''}.
				</p>
				<form action="/auth/logout" method="POST">
					<Button type="submit" variant="outline">Sign out</Button>
				</form>
				{#if !env.PUBLIC_CONVEX_URL}
					<p class="text-sm text-muted-foreground">
						Connect a Convex deployment before saving notes.
					</p>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
	{#if page.data.auth.session && env.PUBLIC_CONVEX_URL}
		<NotesEditor />
	{/if}
</div>
