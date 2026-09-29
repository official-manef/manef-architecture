<script lang="ts">
	import { onMount } from 'svelte';

	export type SegmentItem = { id: string; label: string };

	let {
		items,
		value = $bindable(),
		label,
		onChange
	}: {
		items: readonly SegmentItem[];
		value: string;
		label: string;
		onChange?: (id: string) => void;
	} = $props();
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});

	function select(id: string) {
		value = id;
		onChange?.(id);
	}
</script>

<div class="app-segmented-control" role="group" aria-label={label}>
	{#each items as item (item.id)}
		<button
			type="button"
			disabled={!ready}
			aria-pressed={value === item.id}
			onclick={() => select(item.id)}
		>
			{item.label}
		</button>
	{/each}
</div>
