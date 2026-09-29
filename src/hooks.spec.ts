import { afterEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle, handleError } from './hooks.server';

afterEach(() => vi.restoreAllMocks());

function event() {
	return {
		locals: {},
		url: new URL('https://app.example/auth/callback?code=private-code'),
		request: new Request('https://app.example/auth/callback?code=private-code', {
			headers: { 'x-request-id': 'attacker-supplied-id' }
		}),
		route: { id: '/auth/callback' }
	} as RequestEvent;
}

test('auth responses preserve no-referrer, prevent caching and use a server-created correlation ID', async () => {
	const current = event();
	const response = await handle({
		event: current,
		resolve: async () =>
			new Response(null, {
				status: 303,
				headers: { location: '/apps/notes', 'referrer-policy': 'no-referrer' }
			})
	});
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	expect(response.headers.get('cache-control')).toBe('no-store');
	expect(response.headers.get('x-request-id')).toBe(current.locals.requestId);
	expect(current.locals.requestId).not.toBe('attacker-supplied-id');
	expect(current.locals.requestId).toMatch(/^[0-9a-f-]{36}$/);
});

test('unexpected server errors expose correlation data without provider exceptions or request secrets', async () => {
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});
	const current = event();
	current.locals.requestId = 'server-correlation';
	const result = await handleError({
		event: current,
		status: 500,
		message: 'Internal Error',
		error: new Error('provider-secret-key and private request payload')
	});
	expect(result).toEqual({
		message: 'Something went wrong. Please try again.',
		id: 'server-correlation'
	});
	expect(log).toHaveBeenCalledOnce();
	const logged = JSON.stringify(log.mock.calls);
	expect(logged).toContain('server-correlation');
	expect(logged).not.toMatch(/provider-secret-key|private request payload|private-code|\?code/);
});
