import { afterEach, expect, test, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { resolveAuthConfig } from './config';
import { beginAuthorization, completeAuthorization, refreshIdentity } from './oidc';
import { WORKOS_ORIGIN } from './workos';

const settings = {
	AUTH_ENABLED: 'true',
	AUTH_PROVIDER: 'workos',
	WORKOS_CLIENT_ID: 'client_test',
	WORKOS_API_KEY: 'test-only-workos-credential',
	AUTH_SESSION_SECRET: Buffer.alloc(32, 7).toString('base64url'),
	PUBLIC_SITE_URL: 'https://app.example.com'
};
const enabled = resolveAuthConfig(settings);
if (!enabled.enabled) throw new Error('Test auth is disabled.');
const config = enabled;
afterEach(() => vi.unstubAllGlobals());

type MockOptions = {
	issuer?: string;
	audience?: string | null;
	subject?: string;
	expired?: boolean;
	badSignature?: boolean;
	unverifiedEmail?: boolean;
	providerError?: boolean;
};

async function workosMock(options: MockOptions = {}) {
	const keys = await generateKeyPair('RS256');
	const signingKey = options.badSignature
		? (await generateKeyPair('RS256')).privateKey
		: keys.privateKey;
	const publicKey = {
		...(await exportJWK(keys.publicKey)),
		kid: 'workos-test',
		alg: 'RS256',
		use: 'sig'
	};
	const requests: Record<string, unknown>[] = [];
	const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(input instanceof Request ? input.url : input);
		if (url.origin !== WORKOS_ORIGIN) throw new Error('Unexpected provider host.');
		if (url.pathname === `/sso/jwks/${config.clientId}`)
			return Response.json({ keys: [publicKey] });
		if (url.pathname !== '/user_management/authenticate')
			throw new Error('Unexpected provider path.');
		requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
		if (options.providerError)
			return Response.json({ message: 'secret-provider-response' }, { status: 400 });
		let token = new SignJWT({ sid: 'session_test' })
			.setProtectedHeader({ alg: 'RS256', kid: 'workos-test' })
			.setIssuer(options.issuer ?? `${WORKOS_ORIGIN}/user_management/${config.clientId}`)
			.setSubject(options.subject ?? 'user_test')
			.setIssuedAt()
			.setExpirationTime(Math.floor(Date.now() / 1000) + (options.expired ? -60 : 300));
		if (options.audience) token = token.setAudience(options.audience);
		return Response.json({
			user: {
				id: 'user_test',
				email: 'member@example.com',
				email_verified: !options.unverifiedEmail
			},
			access_token: await token.sign(signingKey),
			refresh_token: 'rotated-test-refresh',
			oauth_tokens: { access_token: 'unused-google-provider-token' }
		});
	});
	vi.stubGlobal('fetch', fetch);
	return { requests, fetch };
}

async function finish(options: MockOptions = {}) {
	const mock = await workosMock(options);
	const { transaction } = await beginAuthorization(config);
	const result = await completeAuthorization(
		config,
		new URL(`${config.redirectUri}?code=test-code&state=${transaction.state}`),
		transaction
	);
	return { mock, result, transaction };
}

test('WorkOS uses the MANEF credential pair, not the direct Google credential pair', () => {
	expect(config).toMatchObject({
		provider: 'workos',
		clientId: settings.WORKOS_CLIENT_ID,
		clientSecret: settings.WORKOS_API_KEY
	});
	expect(() => resolveAuthConfig({ ...settings, WORKOS_API_KEY: '' })).toThrow('WORKOS_API_KEY');
	expect(resolveAuthConfig({})).toEqual({ enabled: false });
});

test('hosted login binds the application, callback, state and S256 PKCE without putting secrets in URLs', async () => {
	const { url, transaction } = await beginAuthorization(config);
	expect(url.origin).toBe(WORKOS_ORIGIN);
	expect(url.pathname).toBe('/user_management/authorize');
	expect(url.searchParams.get('provider')).toBe('authkit');
	expect(url.searchParams.get('client_id')).toBe(config.clientId);
	expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
	expect(url.searchParams.get('state')).toBe(transaction.state);
	expect(url.searchParams.get('code_challenge_method')).toBe('S256');
	expect(url.searchParams.get('code_challenge')).toHaveLength(43);
	expect(url.href).not.toContain(config.clientSecret);
	expect(transaction).toMatchObject({ provider: 'workos', clientId: config.clientId });
});

test('code exchange verifies the signed WorkOS identity and discards Google provider tokens', async () => {
	const { mock, result, transaction } = await finish();
	expect(result).toMatchObject({
		subject: 'user_test',
		email: 'member@example.com',
		issuer: `${WORKOS_ORIGIN}/user_management/${config.clientId}`,
		refreshToken: 'rotated-test-refresh'
	});
	expect(mock.requests[0]).toMatchObject({
		grant_type: 'authorization_code',
		client_id: config.clientId,
		code_verifier: transaction.verifier
	});
	expect(JSON.stringify(result)).not.toContain('unused-google-provider-token');
});

test.each(['state', 'duplicate-state', 'duplicate-code', 'provider', 'client', 'origin'])(
	'rejects an invalid %s before exchanging a code',
	async (failure) => {
		const mock = await workosMock();
		const { transaction } = await beginAuthorization(config);
		const url = new URL(`${config.redirectUri}?code=test-code&state=${transaction.state}`);
		if (failure === 'state') url.searchParams.set('state', 'attacker');
		if (failure === 'duplicate-state') url.searchParams.append('state', transaction.state);
		if (failure === 'duplicate-code') url.searchParams.append('code', 'another');
		if (failure === 'provider') transaction.provider = 'google';
		if (failure === 'client') transaction.clientId = 'another-client';
		if (failure === 'origin') url.hostname = 'attacker.example';
		await expect(completeAuthorization(config, url, transaction)).rejects.toThrow();
		expect(mock.requests).toHaveLength(0);
	}
);

test.each([
	['issuer', { issuer: 'https://attacker.example' }],
	['signature', { badSignature: true }],
	['audience', { audience: 'another-client' }],
	['subject', { subject: 'another-user' }],
	['expiry', { expired: true }],
	['legacy audience', { issuer: `${WORKOS_ORIGIN}/`, audience: null }]
] as [string, MockOptions][])('rejects a token with invalid %s', async (_label, options) => {
	await expect(finish(options)).rejects.toThrow();
});

test('legacy WorkOS issuer requires the exact application audience', async () => {
	const { result } = await finish({ issuer: `${WORKOS_ORIGIN}/`, audience: config.clientId });
	expect(result.issuer).toBe(`${WORKOS_ORIGIN}/`);
	expect(result.subject).toBe('user_test');
});

test('unverified email is not exposed as an authenticated email', async () => {
	const { result } = await finish({ unverifiedEmail: true });
	expect(result.email).toBeUndefined();
});

test('provider errors do not disclose their response content', async () => {
	await expect(finish({ providerError: true })).rejects.toThrow(
		'WorkOS could not complete authentication.'
	);
});

test('refresh rotates credentials and refuses a changed identity', async () => {
	const mock = await workosMock();
	const current = {
		subject: 'user_test',
		idToken: 'old-token',
		idTokenExpiresAt: 1,
		refreshToken: 'old-test-refresh'
	};
	const next = await refreshIdentity(config, current);
	expect(next.refreshToken).toBe('rotated-test-refresh');
	expect(mock.requests[0]).toMatchObject({
		grant_type: 'refresh_token',
		refresh_token: current.refreshToken
	});
	await expect(refreshIdentity(config, { ...current, subject: 'different' })).rejects.toThrow(
		'identity changed'
	);
});
