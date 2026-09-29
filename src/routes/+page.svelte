<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Button } from '$lib/components/ui/button';
	import { appConfig } from '$lib/config/app';
</script>

<main class="grid min-h-dvh w-full place-items-center px-4 py-10 sm:px-6">
	<section class="w-full max-w-4xl space-y-5 py-6 sm:py-10" aria-labelledby="starter-title">
		<p class="text-sm font-medium text-muted-foreground">{appConfig.landing.badge}</p>
		<div class="space-y-3">
			<h1 id="starter-title" class="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
				{appConfig.landing.title}
			</h1>
			<p class="max-w-2xl text-base text-muted-foreground">{appConfig.landing.description}</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button href="/apps/dashboard" size="lg" class="h-11"
				>{appConfig.landing.action} <ArrowRight class="size-4" /></Button
			>
			<Button href="https://svelte.dev/docs/ai/overview" variant="outline" size="lg" class="h-11"
				>Svelte AI docs</Button
			>
		</div>
	</section>
</main>
