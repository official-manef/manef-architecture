// Public, build-time branding only. Never put secrets or per-user state here.
export const appConfig = {
	name: 'Svelte Convex Starter',
	shortName: 'Svelte Convex',
	description:
		'A SvelteKit and Bun starter with example screens, Convex setup, and guides for building your application.',
	locale: 'en',
	themeColor: '#171717',
	backgroundColor: '#fafafa',
	tagline: 'Application starter',
	landing: {
		badge: 'Svelte + Bun + Convex',
		title: 'Build your Svelte app from here.',
		description: 'Explore the example screens, then connect your own Convex backend.',
		action: 'Open starter'
	}
} as const;
