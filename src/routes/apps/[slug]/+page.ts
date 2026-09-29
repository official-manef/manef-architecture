import { error } from '@sveltejs/kit';
import { getApp } from '$features/app-shell';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const app = getApp(params.slug);
	if (!app) error(404, 'App not found');
	return {
		slug: app.slug,
		screen: await app.loadScreen(),
		meta: { title: app.label, description: app.description, indexable: false }
	};
};
