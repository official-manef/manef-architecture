<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { navigating } from '$app/state';
	import FileText from '@lucide/svelte/icons/file-text';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import { LoadingState } from '$lib/components/app-ui';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Activity from '@lucide/svelte/icons/activity';
	import Settings from '@lucide/svelte/icons/settings';
	import { appConfig } from '$lib/config/app';
	import { assets } from '../../../assets.config';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { APP_REGISTRY, getApp, type AppSlug } from '../registry';
	import type { FeatureIcon } from '../types';

	let { activeSlug, screen: Screen }: { activeSlug: AppSlug; screen: Component } = $props();
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	const activeApp = $derived(getApp(activeSlug) ?? APP_REGISTRY[0]);
	const icons = {
		dashboard: LayoutDashboard,
		activity: Activity,
		settings: Settings,
		notes: FileText,
		assistant: MessageSquare
	} as const;
	const loadingLabel = $derived(
		`Loading ${getApp(navigating.to?.params?.slug ?? '')?.label ?? 'page'}`
	);
	const workspaces = [
		{ id: 'starter', label: 'Starter workspace' },
		{ id: 'preview', label: 'Preview workspace' }
	] as const;
	let workspaceId = $state<(typeof workspaces)[number]['id']>('starter');
	const workspace = $derived(workspaces.find((item) => item.id === workspaceId) ?? workspaces[0]);

	function iconFor(icon: FeatureIcon) {
		return icons[icon];
	}
</script>

<div class="flex h-dvh w-full overflow-hidden bg-background">
	<aside class="hidden w-64 shrink-0 flex-col border-r bg-card/70 p-4 lg:flex">
		<a
			href={resolve('/apps/dashboard')}
			class="flex min-h-12 items-center gap-3 rounded-xl px-2"
			aria-label={`${appConfig.name} home`}
		>
			<img src={assets.logo.path} alt="" width="36" height="36" class="size-9 rounded-xl" />
			<span class="min-w-0"
				><strong class="block truncate text-sm">{appConfig.shortName}</strong><span
					class="block truncate text-xs text-muted-foreground">{appConfig.tagline}</span
				></span
			>
		</a>
		<div class="mt-4 rounded-xl border bg-muted/30 px-3 py-3">
			<p class="text-xs font-semibold">{workspace.label}</p>
			<p class="mt-1 text-xs text-muted-foreground">Workspace utility stays outside breadcrumbs.</p>
		</div>
		<nav aria-label="Apps" class="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
			{#each APP_REGISTRY as item (item.slug)}
				{@const Icon = iconFor(item.icon)}
				<Button
					href={`/apps/${item.slug}`}
					variant={item.slug === activeSlug ? 'secondary' : 'ghost'}
					class="h-11 w-full justify-start gap-3 px-3"
					aria-current={item.slug === activeSlug ? 'page' : undefined}
				>
					<Icon class="size-4" /><span class="truncate">{item.label}</span>
				</Button>
			{/each}
		</nav>
		<div class="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
			Root slices → dynamic route → registry SSOT.
		</div>
	</aside>

	<main class="flex min-w-0 flex-1 flex-col overflow-hidden">
		<header class="app-topbar">
			<nav aria-label="Feature breadcrumb" class="app-breadcrumb">
				<ol>
					<li class="max-w-28 truncate text-muted-foreground sm:max-w-44">{workspace.label}</li>
					<li aria-hidden="true" class="shrink-0 text-muted-foreground">
						<ChevronRight class="size-3.5" />
					</li>
					<li aria-current="page" class="min-w-0"><h1 class="truncate">{activeApp.label}</h1></li>
				</ol>
			</nav>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					disabled={!ready}
					class="app-workspace-trigger"
					aria-label={`Switch workspace: ${workspace.label}`}
				>
					<span class="hidden max-w-28 truncate sm:block">{workspace.label}</span>
					<ChevronsUpDown class="size-4 shrink-0" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="min-w-52">
					<DropdownMenu.Label>Workspace</DropdownMenu.Label>
					{#each workspaces as item (item.id)}
						<DropdownMenu.Item onclick={() => (workspaceId = item.id)}>
							<span class="min-w-0 flex-1 truncate">{item.label}</span>
							{#if item.id === workspaceId}<Check class="size-4" />{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</header>

		<section data-app-scroll class="app-content-scroll" aria-busy={Boolean(navigating.to)}>
			{#if navigating.to}<LoadingState label={loadingLabel} />{/if}
			<div hidden={Boolean(navigating.to)}>
				{#key activeSlug}
					<svelte:boundary>
						<Screen />
						{#snippet failed(_error, reset)}
							<div role="alert" class="space-y-3">
								<p>This section could not be displayed.</p>
								<Button onclick={reset}>Try again</Button>
							</div>
						{/snippet}
					</svelte:boundary>
				{/key}
			</div>
		</section>
	</main>

	<nav
		aria-label="Mobile app dock"
		class="app-mobile-dock fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden"
	>
		{#each APP_REGISTRY as item (item.slug)}
			{@const Icon = iconFor(item.icon)}
			<Button
				href={`/apps/${item.slug}`}
				variant="ghost"
				class="h-16 min-w-0 flex-col gap-1 rounded-xl px-1 {item.slug === activeSlug
					? 'bg-muted text-foreground'
					: 'text-muted-foreground'}"
				aria-current={item.slug === activeSlug ? 'page' : undefined}
			>
				<Icon class="size-5" /><span class="max-w-full truncate text-[11px]">{item.label}</span>
			</Button>
		{/each}
	</nav>
</div>
