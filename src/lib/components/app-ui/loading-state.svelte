<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	let { label = 'Loading content', rows = 3 }: { label?: string; rows?: number } = $props();
</script>

<div role="status" aria-live="polite" class="space-y-5">
	<span class="sr-only">{label}</span>
	<div aria-hidden="true" class="space-y-5">
		<Skeleton class="h-7 w-1/3" />
		{#each Array.from({ length: rows }, (_, index) => index) as index (index)}
			<div class="space-y-2 border-b py-4">
				<Skeleton class="h-4 w-2/3" />
				<Skeleton class="h-4 w-full" />
			</div>
		{/each}
	</div>
</div>
