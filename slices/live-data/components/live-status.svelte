<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../src/convex/_generated/api';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';

	const status = useQuery(api.starter.status, {});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2"
			>Convex connection <Badge variant="secondary">Reactive</Badge></Card.Title
		>
		<Card.Description
			><code>useQuery()</code> is already reactive; there is no duplicate <code>$derived</code> wrapper.</Card.Description
		>
	</Card.Header>
	<Card.Content>
		{#if status.isLoading}
			<div class="space-y-2" role="status" aria-label="Loading Convex status">
				<span class="sr-only">Loading Convex status</span>
				<Skeleton class="h-5 w-52" /><Skeleton class="h-4 w-72 max-w-full" />
			</div>
		{:else if status.error}
			<p role="alert" class="text-sm text-destructive">
				Could not reach the backend. Check your connection and Convex deployment, then reload.
			</p>
			<button type="button" class="mt-3 text-sm underline" onclick={() => window.location.reload()}
				>Reload connection</button
			>
		{:else}
			<p class="text-sm font-medium">{status.data.stack}</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Backend template version: {status.data.version}
			</p>
		{/if}
	</Card.Content>
</Card.Root>
