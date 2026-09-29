<script lang="ts">
	import { env } from '$env/dynamic/public';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { FeatureGrid, SignalBanner, ViewportSnapSection } from '$lib/components/app-ui';
	import LiveStatus from './live-status.svelte';
	const configured = Boolean(env.PUBLIC_CONVEX_URL);
</script>

<div class="space-y-5">
	{#if configured}
		<SignalBanner title="Convex URL configured">
			Check the query result below to confirm that your backend is reachable.
		</SignalBanner>
		<FeatureGrid density="comfortable">
			<LiveStatus />
			<Card.Root>
				<Card.Header
					><Card.Title>Runtime behavior</Card.Title><Card.Description
						>Realtime data is a feature capability, not a boot requirement.</Card.Description
					></Card.Header
				>
				<Card.Content class="text-sm leading-6 text-muted-foreground"
					>A fresh clone still builds without credentials. Once linked, the generated API types keep
					the client and backend in sync.</Card.Content
				>
			</Card.Root>
		</FeatureGrid>
	{:else}
		<SignalBanner title="Connect your backend">
			The frontend works without a backend connection. Follow the steps below when you need data
			from Convex.
		</SignalBanner>
		<ViewportSnapSection>
			<FeatureGrid density="comfortable">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex flex-wrap items-center gap-2"
							>Convex is ready to link <Badge variant="outline">Not configured</Badge></Card.Title
						>
						<Card.Description
							>The frontend still builds cleanly before a Convex deployment exists.</Card.Description
						>
					</Card.Header>
					<Card.Content class="space-y-3 text-sm text-muted-foreground">
						<p>
							Run <code class="rounded bg-muted px-1.5 py-0.5">bunx convex dev</code>, then expose
							its URL as <code>PUBLIC_CONVEX_URL</code>.
						</p>
						<p>
							Do not reuse another project's deployment merely to make a starter screen look
							connected.
						</p>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header
						><Card.Title>After linking</Card.Title><Card.Description
							>Keep the data boundary typed and server-authorized.</Card.Description
						></Card.Header
					>
					<Card.Content class="text-sm leading-6 text-muted-foreground"
						>Regenerate Convex types after adding functions, and keep growing reads indexed and
						bounded.</Card.Content
					>
				</Card.Root>
			</FeatureGrid>
		</ViewportSnapSection>
	{/if}
</div>
