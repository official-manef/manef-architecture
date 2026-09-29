import { error, json } from '@sveltejs/kit';
import { readJsonBody, requireAppOrigin } from '$lib/server/access';
import { configuredAuth, getConvexToken } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const config = configuredAuth();
	requireAppOrigin(event.request, config.origin);
	const body = await readJsonBody(event.request, 256);
	if (
		!body ||
		typeof body !== 'object' ||
		Array.isArray(body) ||
		Object.keys(body).some((key) => key !== 'forceRefreshToken') ||
		('forceRefreshToken' in body && typeof body.forceRefreshToken !== 'boolean')
	)
		error(400, 'Send an optional boolean forceRefreshToken.');
	const idToken = await getConvexToken(event, body);
	return json({ idToken }, { headers: { 'cache-control': 'no-store', pragma: 'no-cache' } });
};
