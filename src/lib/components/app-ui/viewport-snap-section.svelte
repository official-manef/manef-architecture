<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let { children, class: className }: { children: Snippet; class?: string } = $props();
	let node: HTMLDivElement;
	let snapReady = $state(false);

	$effect(() => {
		if (!node || typeof ResizeObserver === 'undefined') return;
		const scrollOwner = node.closest<HTMLElement>('[data-app-scroll]');
		if (!scrollOwner) return;

		const measure = () => {
			const viewport = scrollOwner.clientHeight;
			const height = node.getBoundingClientRect().height;
			snapReady = viewport > 0 && height >= viewport * 0.88;
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		observer.observe(scrollOwner);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={node}
	class={cn('app-viewport-snap-section', className)}
	data-snap-ready={snapReady ? 'true' : 'false'}
>
	{@render children()}
</div>
