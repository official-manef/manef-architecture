<script lang="ts">
	import './layout.css';
	import { appConfig } from '$lib/config/app';
	import { assets, assetMimeType } from '../../assets.config';
	import { pageMetadata, pageIndexable, seoSettings } from '$lib/config/metadata';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { setupConvex, setupAuth } from 'convex-svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const convexUrl = env.PUBLIC_CONVEX_URL;
	if (convexUrl) {
		setupConvex(convexUrl);
		setupAuth(() => ({
			isLoading: false,
			isAuthenticated: Boolean(data.auth.session),
			fetchAccessToken: async ({ forceRefreshToken }) => {
				if (!data.auth.session) return null;
				try {
					const response = await fetch('/auth/token', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ forceRefreshToken }),
						signal: AbortSignal.timeout(15_000)
					});
					if (!response.ok) return null;
					const result: unknown = await response.json();
					return result &&
						typeof result === 'object' &&
						'idToken' in result &&
						typeof result.idToken === 'string'
						? result.idToken
						: null;
				} catch {
					return null;
				}
			}
		}));
	}
	const seo = seoSettings(env);
	const metadata = $derived(
		pageMetadata(
			page.error ? { title: `${page.status}` } : page.data.meta,
			page.url.pathname,
			seo.origin
		)
	);
</script>

<svelte:head>
	<title>{metadata.title}</title>
	<meta name="description" content={metadata.description} />
	<link rel="icon" type={assetMimeType(assets.favicon.path)} href={assets.favicon.path} />
	<link rel="apple-touch-icon" href={assets.appleIcon.path} />
	<link rel="manifest" href="/site.webmanifest" />
	<meta name="theme-color" content={appConfig.themeColor} />
	<meta
		name="robots"
		content={pageIndexable(seo, page.data.meta, page.status) ? 'index,follow' : 'noindex,nofollow'}
	/>
	{#if metadata.canonical}<link rel="canonical" href={metadata.canonical} /><meta
			property="og:url"
			content={metadata.canonical}
		/>{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={appConfig.name} />
	<meta property="og:title" content={metadata.title} />
	<meta property="og:description" content={metadata.description} />
	<meta property="og:image" content={metadata.image} />
	<meta property="og:image:width" content={String(assets.socialImage.width)} />
	<meta property="og:image:height" content={String(assets.socialImage.height)} />
	<meta property="og:image:alt" content={`${appConfig.name} preview`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={metadata.title} />
	<meta name="twitter:description" content={metadata.description} />
	<meta name="twitter:image" content={metadata.image} />
	{#if seo.twitterSite}<meta name="twitter:site" content={seo.twitterSite} />{/if}
	{#if seo.googleVerification}<meta
			name="google-site-verification"
			content={seo.googleVerification}
		/>{/if}
	{#if seo.bingVerification}<meta name="msvalidate.01" content={seo.bingVerification} />{/if}
</svelte:head>
{@render children()}
