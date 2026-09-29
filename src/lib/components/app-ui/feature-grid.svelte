<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		children,
		density = 'comfortable',
		class: className
	}: {
		children: Snippet;
		density?: 'compact' | 'comfortable' | 'wide';
		class?: string;
	} = $props();
</script>

<div class={cn('app-feature-grid', className)} data-density={density}>
	{@render children()}
</div>
