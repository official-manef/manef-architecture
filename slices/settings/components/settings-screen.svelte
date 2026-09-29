<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { bunVersion, templateVersion } from '$lib/version';
	import {
		DisclosureCard,
		FeatureGrid,
		SegmentedControl,
		SignalBanner,
		type SegmentItem
	} from '$lib/components/app-ui';

	const sections = [
		{ id: 'workspace', label: 'Workspace' },
		{ id: 'interface', label: 'Interface' }
	] as const satisfies readonly SegmentItem[];
	let section = $state('workspace');
	let workspaceName = $state('Starter workspace');
	const cleanWorkspaceName = $derived(workspaceName.trim() || 'Untitled workspace');
</script>

<div class="space-y-5">
	<SegmentedControl items={sections} bind:value={section} label="Settings section" />

	{#if section === 'workspace'}
		<FeatureGrid density="wide">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex flex-wrap items-center gap-2"
						>Workspace <Badge variant="secondary">{cleanWorkspaceName}</Badge></Card.Title
					>
					<Card.Description
						>This name is a local preview. It resets when you leave this page or reload.</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<label for="workspace-name" class="text-sm font-medium">Workspace name</label>
					<Input id="workspace-name" class="mt-2 w-full" bind:value={workspaceName} />
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header
					><Card.Title>Runtime versions</Card.Title><Card.Description
						>Bun manages packages and scripts. New Svelte code uses Runes.</Card.Description
					></Card.Header
				>
				<Card.Content class="space-y-3 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">Package manager</span><code
							class="rounded-lg bg-muted px-3 py-2">Bun {bunVersion}</code
						>
					</div>
					<p class="text-muted-foreground">Template version {templateVersion}</p>
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">Svelte syntax</span><Badge variant="outline"
							>Runes only</Badge
						>
					</div>
				</Card.Content>
			</Card.Root>
		</FeatureGrid>

		<DisclosureCard summary="Advanced template rules">
			<p class="text-sm leading-6 text-muted-foreground">
				Keep user customization in data/config, keep routes thin, and register repeated page
				families once. Do not add compatibility files only to preserve obsolete imports.
			</p>
		</DisclosureCard>
	{:else}
		<SignalBanner title="Interface layout follows content, not device labels">
			Auto-fit grids react to available space, local modes remain horizontally scrollable when
			necessary, and mobile rails reveal continuation with partial next-card visibility.
		</SignalBanner>
		<FeatureGrid density="compact">
			<Card.Root
				><Card.Header
					><Card.Title>Adaptive grid</Card.Title><Card.Description
						>1 → 2 → 3+ columns emerge from minimum useful card width.</Card.Description
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Title>App-first mobile</Card.Title><Card.Description
						>Carousel, banner, segmented modes and disclosures replace compressed desktop rows.</Card.Description
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Title>Viewport snap</Card.Title><Card.Description
						>Proximity snap activates only for sections measured near a full content viewport.</Card.Description
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Title>Touch contract</Card.Title><Card.Description
						>Primary controls target roughly 44px and spatial interactions need mouse, touch and
						keyboard equivalents.</Card.Description
					></Card.Header
				></Card.Root
			>
		</FeatureGrid>
	{/if}
</div>
