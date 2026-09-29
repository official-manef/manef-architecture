export const notesFeature = {
	slug: 'notes',
	label: 'Private notes',
	description: 'Create and edit notes saved to your signed-in account.',
	icon: 'notes',
	loadScreen: () => import('./components/notes-screen.svelte').then((module) => module.default)
} as const;
