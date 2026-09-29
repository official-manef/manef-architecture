<script lang="ts">
	import { AppShell } from '$features/app-shell';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<AppShell activeSlug={data.slug} screen={data.screen} />
