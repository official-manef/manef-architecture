// Public, build-time branding only. Never put secrets or per-user state here.
export const appConfig = {
	name: 'MANEF Architecture',
	shortName: 'MANEF',
	description: 'Explore the public MANEF service architecture and its connected inventory.',
	locale: 'en',
	themeColor: '#171717',
	backgroundColor: '#fafafa',
	tagline: 'Architecture inventory',
	landing: {
		badge: 'MANEF Architecture',
		title: 'Explore the MANEF architecture.',
		description: 'A reusable, interactive map of MANEF public services.',
		action: 'Explore architecture'
	}
} as const;
