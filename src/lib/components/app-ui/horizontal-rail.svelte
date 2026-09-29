<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		children,
		label,
		desktopGrid = true,
		class: className
	}: {
		children: Snippet;
		label: string;
		desktopGrid?: boolean;
		class?: string;
	} = $props();
</script>

<section
	class={cn('app-horizontal-rail', className)}
	data-desktop-grid={desktopGrid ? 'true' : 'false'}
	aria-label={label}
>
	{@render children()}
</section>
