<script lang="ts">
	import { useAuth, useConvexClient, useQuery } from 'convex-svelte';
	import { ConvexError } from 'convex/values';
	import { api } from '../../../src/convex/_generated/api';
	import type { Id } from '../../../src/convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	const client = useConvexClient();
	const auth = useAuth();
	const notes = useQuery(api.notes.list, () => (auth.isAuthenticated ? {} : 'skip'));
	let body = $state('');
	let editing = $state<Id<'notes'> | null>(null);
	let pending = $state(false);
	let failure = $state('');
	let message = $state('');
	let editor = $state<HTMLTextAreaElement>();

	function reset() {
		body = '';
		editing = null;
	}
	function showError(cause: unknown) {
		failure =
			cause instanceof ConvexError && typeof cause.data === 'string'
				? cause.data
				: 'The note could not be changed. Check your connection and try again.';
	}
	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		pending = true;
		failure = '';
		message = '';
		try {
			if (editing) await client.mutation(api.notes.update, { id: editing, body });
			else await client.mutation(api.notes.create, { body });
			reset();
			message = 'Note saved.';
		} catch (cause) {
			showError(cause);
		} finally {
			pending = false;
		}
	}
	async function remove(id: Id<'notes'>) {
		if (pending || !window.confirm('Delete this note? This cannot be undone.')) return;
		pending = true;
		failure = '';
		message = '';
		try {
			await client.mutation(api.notes.remove, { id });
			if (editing === id) reset();
			message = 'Note deleted.';
		} catch (cause) {
			showError(cause);
		} finally {
			pending = false;
		}
	}
</script>

{#if auth.isLoading}
	<p role="status" class="text-sm text-muted-foreground">Checking your sign-in…</p>
{:else if !auth.isAuthenticated}
	<div class="space-y-3">
		<p role="alert" class="text-sm text-destructive">
			Your session expired or the backend could not verify it. Sign in again to open your notes.
		</p>
		<Button href="/auth/login" data-sveltekit-reload>Sign in again</Button>
	</div>
{:else}
	<Card.Root>
		<Card.Header
			><Card.Title>{editing ? 'Edit note' : 'New note'}</Card.Title><Card.Description
				>Up to 100 notes, with 2,000 characters each.</Card.Description
			></Card.Header
		>
		<Card.Content>
			<form class="space-y-3" onsubmit={save}>
				<label for="note-body" class="block text-sm font-medium">Note</label>
				<textarea
					bind:this={editor}
					bind:value={body}
					id="note-body"
					rows="5"
					maxlength="2000"
					required
					disabled={pending}
					class="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
				></textarea>
				<div class="flex flex-wrap gap-2">
					<Button type="submit" disabled={pending || !body.trim()}
						>{pending ? 'Saving…' : editing ? 'Save changes' : 'Save note'}</Button
					>
					{#if editing}<Button type="button" variant="outline" disabled={pending} onclick={reset}
							>Cancel edit</Button
						>{/if}
				</div>
			</form>
			{#if failure}<p role="alert" class="mt-3 text-sm text-destructive">{failure}</p>{/if}
			<p role="status" class="mt-3 text-sm text-muted-foreground">{message}</p>
		</Card.Content>
	</Card.Root>
	{#if notes.isLoading}
		<p role="status" class="text-sm text-muted-foreground">Loading your notes…</p>
	{:else if notes.error}
		<p role="alert" class="text-sm text-destructive">
			Your notes could not be loaded. Check your connection and sign-in.
		</p>
	{:else if notes.data.length === 0}
		<p class="text-sm text-muted-foreground">You have no notes yet. Save your first draft above.</p>
	{:else}
		<ul class="space-y-3" aria-label="Your notes">
			{#each notes.data as note (note._id)}
				<li class="space-y-3 rounded-xl border bg-card p-4">
					<p class="text-sm wrap-anywhere whitespace-pre-wrap">{note.body}</p>
					<div class="flex gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={pending}
							onclick={() => {
								editing = note._id;
								body = note.body;
								failure = '';
								message = '';
								editor?.focus();
							}}>Edit</Button
						>
						<Button
							type="button"
							variant="destructive"
							disabled={pending}
							onclick={() => remove(note._id)}>Delete</Button
						>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
