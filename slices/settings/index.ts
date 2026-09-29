export const settingsFeature = {
	slug: 'settings',
	label: 'Settings',
	description: 'Responsive settings rows that stack on narrow phones.',
	icon: 'settings',
	loadScreen: () => import('./components/settings-screen.svelte').then((module) => module.default)
} as const;
