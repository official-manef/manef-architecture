<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		title,
		children,
		action,
		class: className
	}: { title: string; children: Snippet; action?: Snippet; class?: string } = $props();
</script>

<section class={cn('app-signal-banner', className)}>
	<div class="min-w-0 flex-1">
		<h2 class="text-sm font-semibold">{title}</h2>
		<div class="mt-1 text-sm leading-6 text-muted-foreground">{@render children()}</div>
	</div>
	{#if action}
		<div class="shrink-0">{@render action()}</div>
	{/if}
</section>
