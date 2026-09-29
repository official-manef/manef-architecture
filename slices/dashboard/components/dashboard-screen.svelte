<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { stackVersions as metrics } from '$lib/version';
	import {
		DisclosureCard,
		FeatureGrid,
		HorizontalRail,
		SegmentedControl,
		SignalBanner,
		ViewportSnapSection,
		type SegmentItem
	} from '$lib/components/app-ui';

	const modes = [
		{ id: 'architecture', label: 'Architecture' },
		{ id: 'interaction', label: 'Interaction kit' }
	] as const satisfies readonly SegmentItem[];
	let mode = $state('architecture');
</script>

<div class="space-y-5">
	<SignalBanner title="App-first and content-aware by default">
		The starter uses the same structural rule across features: cards fill available space, rails
		snap only when they overflow, and tall sections become proximity snap targets only after
		measurement.
	</SignalBanner>

	<HorizontalRail label="Stack versions" desktopGrid>
		{#each metrics as metric (metric.label)}
			<Card.Root class="min-w-0">
				<Card.Header class="gap-2 p-4 sm:p-5">
					<Badge variant="secondary" class="w-fit">{metric.label}</Badge>
					<Card.Title class="truncate text-xl sm:text-2xl">{metric.value}</Card.Title>
					<Card.Description>{metric.hint}</Card.Description>
				</Card.Header>
			</Card.Root>
		{/each}
	</HorizontalRail>

	<SegmentedControl items={modes} bind:value={mode} label="Dashboard reference mode" />

	{#if mode === 'architecture'}
		<ViewportSnapSection>
			<Card.Root>
				<Card.Header>
					<Card.Title>Architecture contract</Card.Title>
					<Card.Description
						>Routes adapt. Root slices own features. Registry owns page families.</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<FeatureGrid density="compact">
						<article class="rounded-xl border bg-muted/30 p-4">
							<p class="text-sm font-semibold">Root slices</p>
							<p class="mt-1 text-sm text-muted-foreground">
								<code>slices/&lt;slug&gt;/</code> is the consumer feature boundary.
							</p>
						</article>
						<article class="rounded-xl border bg-muted/30 p-4">
							<p class="text-sm font-semibold">Dynamic page</p>
							<p class="mt-1 text-sm text-muted-foreground">
								<code>/apps/[slug]</code> resolves the typed registry.
							</p>
						</article>
						<article class="rounded-xl border bg-muted/30 p-4">
							<p class="text-sm font-semibold">SSOT / DRY</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Nav, labels, icons and screens derive from the same registry.
							</p>
						</article>
					</FeatureGrid>
				</Card.Content>
			</Card.Root>
		</ViewportSnapSection>
	{:else}
		<FeatureGrid density="comfortable">
			<Card.Root>
				<Card.Header
					><Card.Title>Adaptive grid</Card.Title><Card.Description
						>Uses CSS auto-fit/minmax instead of one fixed breakpoint column count.</Card.Description
					></Card.Header
				>
			</Card.Root>
			<Card.Root>
				<Card.Header
					><Card.Title>Overflow-aware rail</Card.Title><Card.Description
						>Horizontal snap is intentional on small screens and becomes a grid when space returns.</Card.Description
					></Card.Header
				>
			</Card.Root>
			<Card.Root>
				<Card.Header
					><Card.Title>Measured viewport snap</Card.Title><Card.Description
						>ResizeObserver marks only sections near a full content viewport as vertical snap
						targets.</Card.Description
					></Card.Header
				>
			</Card.Root>
			<DisclosureCard summary="Why this stays dynamic">
				<p class="text-sm leading-6 text-muted-foreground">
					The primitives publish structural intent. Feature slices supply content, while CSS decides
					how many columns fit and runtime measurement decides whether vertical snap is appropriate.
				</p>
			</DisclosureCard>
		</FeatureGrid>
	{/if}
</div>
