import { afterEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	authConfiguration,
	consumeTransaction,
	establishSession,
	readSession,
	saveTransaction
} from './session';
import { beginAuthorization } from './oidc';
import { verifyWorkosAccessToken } from './workos';

const { privateEnv, publicEnv } = vi.hoisted(() => ({
	privateEnv: {
		AUTH_ENABLED: 'true',
		AUTH_PROVIDER: 'workos',
		WORKOS_CLIENT_ID: 'client_test',
		WORKOS_API_KEY: 'test-only-workos-key',
		AUTH_SESSION_SECRET: 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc'
	},
	publicEnv: { PUBLIC_SITE_URL: 'https://app.example.com' }
}));
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('./workos', async (original) => ({
	...(await original<typeof import('./workos')>()),
	verifyWorkosAccessToken: vi.fn()
}));
afterEach(() => vi.clearAllMocks());

function browserEvent() {
	const values = new Map<string, string>();
	const set = vi.fn((name: string, value: string) => values.set(name, value));
	return {
		values,
		set,
		url: new URL(publicEnv.PUBLIC_SITE_URL),
		request: new Request(publicEnv.PUBLIC_SITE_URL),
		cookies: {
			get: (name: string) => values.get(name),
			set,
			delete: (name: string) => values.delete(name)
		} as unknown as RequestEvent['cookies']
	};
}

test('WorkOS session is isolated from legacy Google cookies and revalidates its JWT', async () => {
	const config = authConfiguration();
	if (!config.enabled) throw new Error('Test auth disabled.');
	const current = browserEvent();
	const issuer = `https://api.workos.com/user_management/${config.clientId}`;
	current.values.set('__Host-starter-session', 'legacy-google-cookie');
	vi.mocked(verifyWorkosAccessToken).mockResolvedValue({
		iss: issuer,
		sub: 'user_test',
		exp: Math.floor(Date.now() / 1000) + 300,
		sid: 'session_test'
	});
	await establishSession(current, config, {
		subject: 'user_test',
		issuer,
		idToken: 'signed-test-token',
		idTokenExpiresAt: Math.floor(Date.now() / 1000) + 300
	});
	expect(current.values.has('__Host-manef-workos-session')).toBe(true);
	expect(current.values.get('__Host-starter-session')).toBe('legacy-google-cookie');
	expect(await readSession(current)).toMatchObject({
		subject: 'user_test',
		tokenIdentifier: `${issuer}|user_test`
	});
	expect(verifyWorkosAccessToken).toHaveBeenCalledWith(config, 'signed-test-token', 'user_test');
	vi.mocked(verifyWorkosAccessToken).mockRejectedValue(new Error('invalid signature'));
	expect(await readSession(current)).toBeNull();
	expect(current.values.has('__Host-manef-workos-session')).toBe(false);
});

test('encrypted WorkOS transactions preserve provider/client binding and are consumed once', async () => {
	const config = authConfiguration();
	if (!config.enabled) throw new Error('Test auth disabled.');
	const current = browserEvent();
	const { transaction } = await beginAuthorization(config);
	await saveTransaction(current, config, transaction);
	expect(current.values.has('__Host-manef-workos-transaction')).toBe(true);
	expect(await consumeTransaction(current, config)).toEqual(transaction);
	expect(await consumeTransaction(current, config)).toBeNull();
});
