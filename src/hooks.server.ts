import type { Handle, HandleServerError } from '@sveltejs/kit';
import { appConfig } from '$lib/config/app';

if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(appConfig.locale)) {
	throw new Error('Set a valid language tag in appConfig.locale.');
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%app.locale%', appConfig.locale)
	});
	response.headers.set('X-Content-Type-Options', 'nosniff');
	// Allow same-origin framing so the diagram can be embedded in sibling MANEF surfaces.
	// Cross-origin embedding remains governed by the Content-Security-Policy frame-ancestors.
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	if (!response.headers.has('Content-Security-Policy'))
		response.headers.set(
			'Content-Security-Policy',
			"frame-ancestors 'self' https://*.manef.dev https://mso.rahmanef.com"
		);
	if (!response.headers.has('Referrer-Policy'))
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Request-Id', event.locals.requestId);
	if (event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/auth/')) {
		response.headers.set('Cache-Control', 'no-store');
	}
	return response;
};

export const handleError: HandleServerError = ({ event, status }) => {
	const id = event.locals.requestId ?? crypto.randomUUID();
	// Provider exceptions may contain credentials or request payloads. Log only correlation data.
	console.error('request_failed', {
		id,
		status,
		method: event.request.method,
		route: event.route.id
	});
	return { message: 'Something went wrong. Please try again.', id };
};
