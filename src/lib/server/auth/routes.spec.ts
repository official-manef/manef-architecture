import { beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST as token } from '../../../routes/auth/token/+server';
import { POST as logout } from '../../../routes/auth/logout/+server';
import { GET as callback } from '../../../routes/auth/callback/+server';
import { authConfiguration, establishSession } from './session';

const { privateEnv, publicEnv } = vi.hoisted(() => ({
	privateEnv: {} as Record<string, string>,
	publicEnv: { PUBLIC_SITE_URL: 'https://app.example.com' }
}));
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));

function event<Route extends '/auth/token' | '/auth/logout' | '/auth/callback'>(
	path: Route,
	origin = publicEnv.PUBLIC_SITE_URL,
	body: unknown = {},
	search = ''
) {
	const values = new Map<string, string>();
	const url = new URL(path + search, publicEnv.PUBLIC_SITE_URL);
	const get = path.startsWith('/auth/callback');
	return {
		url,
		request: new Request(
			url,
			get
				? {}
				: {
						method: 'POST',
						headers: { origin, 'content-type': 'application/json' },
						body: JSON.stringify(body)
					}
		),
		setHeaders: vi.fn(),
		cookies: {
			get: (name: string) => values.get(name),
			set: (name: string, value: string) => values.set(name, value),
			delete: (name: string) => values.delete(name)
		}
	} as unknown as RequestEvent<Record<string, never>, Route>;
}

beforeEach(() => {
	Object.assign(privateEnv, {
		AUTH_ENABLED: 'true',
		AUTH_CLIENT_ID: 'test-client',
		AUTH_CLIENT_SECRET: 'test-secret',
		AUTH_SESSION_SECRET: Buffer.alloc(32, 7).toString('base64url')
	});
});

test('token and sign-out reject cross-origin requests, including requests with no Origin', async () => {
	await expect(token(event('/auth/token', 'https://attacker.example'))).rejects.toMatchObject({
		status: 403
	});
	expect(() => logout(event('/auth/logout', 'https://attacker.example'))).toThrow();
	await expect(token(event('/auth/token', ''))).rejects.toMatchObject({ status: 403 });
});

test('token responses are uncached and release only an ID token to a same-origin signed-in browser', async () => {
	const current = event('/auth/token');
	const config = authConfiguration();
	if (!config.enabled) throw new Error('Test auth disabled.');
	await establishSession(current, config, {
		subject: 'member',
		idToken: 'test-id-token',
		idTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
		refreshToken: 'private-refresh'
	});
	const response = await token(current);
	expect(response.headers.get('cache-control')).toBe('no-store');
	expect(await response.json()).toEqual({ idToken: 'test-id-token' });
	await expect(
		token(event('/auth/token', undefined, { forceRefreshToken: 'yes' }))
	).rejects.toMatchObject({ status: 400 });
	await expect(token(event('/auth/token', undefined, { unknown: true }))).rejects.toMatchObject({
		status: 400
	});
});

test('disabled auth and callbacks without a login transaction fail closed', async () => {
	await expect(
		callback(event('/auth/callback', undefined, {}, '?code=unexpected&state=unexpected'))
	).rejects.toMatchObject({ status: 400 });
	privateEnv.AUTH_ENABLED = 'false';
	await expect(token(event('/auth/token'))).rejects.toMatchObject({ status: 404 });
});
