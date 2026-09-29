export const dashboardFeature = {
	slug: 'dashboard',
	label: 'Dashboard',
	description: 'Full-width overview built from one root vertical slice.',
	icon: 'dashboard',
	loadScreen: () => import('./components/dashboard-screen.svelte').then((module) => module.default)
} as const;
