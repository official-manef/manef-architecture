import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { resolveAuthConfig } from './config';
import { refreshIdentity } from './oidc';
import {
	authConfiguration,
	clearSession,
	consumeTransaction,
	establishSession,
	getConvexToken,
	readSession,
	requireSession,
	saveTransaction
} from './session';

const { privateEnv, publicEnv } = vi.hoisted(() => ({
	privateEnv: {} as Record<string, string>,
	publicEnv: { PUBLIC_SITE_URL: 'https://app.example.com' }
}));
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('./oidc', async (original) => ({
	...(await original<typeof import('./oidc')>()),
	refreshIdentity: vi.fn()
}));

function event() {
	const values = new Map<string, string>();
	const set = vi.fn((name: string, value: string) => {
		values.set(name, value);
	});
	const cookies = {
		get: (name: string) => values.get(name),
		set,
		delete: (name: string) => {
			values.delete(name);
		}
	} as unknown as RequestEvent['cookies'];
	return {
		cookies,
		request: new Request(`${publicEnv.PUBLIC_SITE_URL}/auth/token`),
		url: new URL(publicEnv.PUBLIC_SITE_URL),
		values,
		set
	};
}

function config() {
	const value = authConfiguration();
	if (!value.enabled) throw new Error('Test auth is disabled.');
	return value;
}

const tokens = () => ({
	subject: 'member-1',
	email: 'member@example.com',
	idToken: 'test-id-token',
	idTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
	refreshToken: 'test-refresh'
});

beforeEach(() => {
	Object.assign(privateEnv, {
		AUTH_ENABLED: 'true',
		AUTH_CLIENT_ID: 'test-client',
		AUTH_CLIENT_SECRET: 'test-secret',
		AUTH_SESSION_SECRET: Buffer.alloc(32, 7).toString('base64url')
	});
	vi.mocked(refreshIdentity).mockReset();
});
afterEach(() => vi.useRealTimers());

test('disabled auth requires no provider configuration and never yields a session', async () => {
	expect(resolveAuthConfig({})).toEqual({ enabled: false });
	privateEnv.AUTH_ENABLED = 'false';
	expect(await readSession(event())).toBeNull();
	await expect(requireSession(event())).rejects.toMatchObject({ status: 401 });
	expect(refreshIdentity).not.toHaveBeenCalled();
});

test('session cookies are encrypted, bounded and separate from the safe server session result', async () => {
	const current = event();
	await establishSession(current, config(), tokens());
	const [name, value, options] = current.set.mock.calls[0] as unknown as [
		string,
		string,
		Record<string, unknown>
	];
	expect(name).toBe('__Host-starter-session');
	expect(value).not.toContain('test-id-token');
	expect(value.length).toBeLessThanOrEqual(3800);
	expect(options).toMatchObject({
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 3600
	});
	expect(await readSession(current)).toEqual({
		subject: 'member-1',
		tokenIdentifier: 'https://accounts.google.com|member-1',
		email: 'member@example.com',
		expiresAt: expect.any(Number)
	});
	expect(await getConvexToken(current)).toBe('test-id-token');
	clearSession(current, config());
	expect(await readSession(current)).toBeNull();
});

test('tampered cookies and a consumed login transaction cannot establish an identity', async () => {
	const current = event();
	await establishSession(current, config(), tokens());
	const name = '__Host-starter-session';
	const value = current.values.get(name)!;
	current.values.set(name, `${value.slice(0, -8)}AAAAAAAA`);
	expect(await readSession(current)).toBeNull();
	const transaction = { verifier: 'v'.repeat(43), state: 's'.repeat(43), nonce: 'n'.repeat(43) };
	await saveTransaction(current, config(), transaction);
	expect(await consumeTransaction(current, config())).toEqual(transaction);
	expect(await consumeTransaction(current, config())).toBeNull();
});

test('refresh preserves the absolute one-hour session limit and failure clears the session', async () => {
	vi.useFakeTimers();
	const current = event();
	await establishSession(current, config(), tokens());
	const expiresAt = (await readSession(current))!.expiresAt;
	vi.mocked(refreshIdentity).mockResolvedValue({ ...tokens(), idToken: 'new-id-token' });
	expect(await getConvexToken(current, { forceRefreshToken: true })).toBe('new-id-token');
	expect((await readSession(current))!.expiresAt).toBe(expiresAt);
	vi.setSystemTime(expiresAt + 1000);
	expect(await readSession(current)).toBeNull();
	await establishSession(current, config(), tokens());
	vi.mocked(refreshIdentity).mockRejectedValue(new Error('revoked'));
	expect(await getConvexToken(current, { forceRefreshToken: true })).toBeNull();
	expect(current.values.has('__Host-starter-session')).toBe(false);
});

test('large refresh credentials are omitted and expired nonrenewable sessions require sign-in', async () => {
	vi.useFakeTimers();
	const current = event();
	const identity = {
		...tokens(),
		refreshToken: 'x'.repeat(4000),
		idTokenExpiresAt: Math.floor(Date.now() / 1000) + 120
	};
	await establishSession(current, config(), identity);
	expect(await getConvexToken(current, { forceRefreshToken: true })).toBe(identity.idToken);
	expect(refreshIdentity).not.toHaveBeenCalled();
	vi.setSystemTime(Date.now() + 121_000);
	expect(await readSession(current)).toBeNull();
});
