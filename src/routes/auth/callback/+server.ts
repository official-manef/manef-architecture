import { error, redirect } from '@sveltejs/kit';
import { completeAuthorization } from '$lib/server/auth/oidc';
import { configuredAuth, consumeTransaction, establishSession } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const config = configuredAuth();
	event.setHeaders({ 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
	const transaction = await consumeTransaction(event, config);
	if (event.url.origin !== config.origin || !transaction)
		error(400, 'This sign-in request expired or is invalid. Start sign-in again.');
	try {
		const tokens = await completeAuthorization(config, event.url, transaction);
		await establishSession(event, config, tokens);
	} catch {
		// Provider responses can contain credentials; do not echo or log the raw exception.
		error(400, 'Sign-in could not be verified. Start sign-in again.');
	}
	redirect(303, '/apps/notes');
};
