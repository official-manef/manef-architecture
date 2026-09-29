export const liveDataFeature = {
	slug: 'live-data',
	label: 'Live data',
	description: 'A Convex Svelte 5 query that activates after a deployment is linked.',
	icon: 'activity',
	loadScreen: () => import('./components/live-data-screen.svelte').then((module) => module.default)
} as const;
