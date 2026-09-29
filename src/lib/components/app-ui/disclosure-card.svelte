<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		summary,
		children,
		class: className
	}: { summary: string; children: Snippet; class?: string } = $props();
</script>

<details class={cn('app-disclosure-card group', className)}>
	<summary>
		<span>{summary}</span>
		<ChevronDown class="size-4 transition-transform group-open:rotate-180" />
	</summary>
	<div class="border-t px-4 py-4 sm:px-5">{@render children()}</div>
</details>
