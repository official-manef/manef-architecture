import { authConfiguration, readSession } from '$lib/server/auth/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	event.depends('app:session');
	event.setHeaders({ 'cache-control': 'private, no-store' });
	return { auth: { enabled: authConfiguration().enabled, session: await readSession(event) } };
};
