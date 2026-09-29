import { afterEach, expect, test, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { resolveAuthConfig } from './config';
import { beginAuthorization, completeAuthorization, refreshIdentity, GOOGLE_ISSUER } from './oidc';

const enabled = resolveAuthConfig({
	AUTH_ENABLED: 'true',
	AUTH_CLIENT_ID: 'test-client',
	AUTH_CLIENT_SECRET: 'test-secret',
	AUTH_SESSION_SECRET: Buffer.alloc(32, 7).toString('base64url'),
	PUBLIC_SITE_URL: 'https://app.example.com'
});
if (!enabled.enabled) throw new Error('Test configuration is disabled.');
const config = enabled;

afterEach(() => vi.unstubAllGlobals());

async function googleMock(
	options: {
		nonce?: string;
		subject?: string;
		audience?: string;
		expired?: boolean;
		badSignature?: boolean;
	} = {}
) {
	const keys = await generateKeyPair('RS256');
	const signingKey = options.badSignature
		? (await generateKeyPair('RS256')).privateKey
		: keys.privateKey;
	const publicKey = {
		...(await exportJWK(keys.publicKey)),
		kid: 'test-key',
		alg: 'RS256',
		use: 'sig'
	};
	let nonce = options.nonce;
	const requests: URLSearchParams[] = [];
	const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(input instanceof Request ? input.url : input);
		const json = (body: unknown) =>
			new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
		if (url.pathname === '/.well-known/openid-configuration') {
			return json({
				issuer: GOOGLE_ISSUER,
				authorization_endpoint: `${GOOGLE_ISSUER}/authorize`,
				token_endpoint: `${GOOGLE_ISSUER}/token`,
				jwks_uri: `${GOOGLE_ISSUER}/jwks`,
				response_types_supported: ['code'],
				subject_types_supported: ['public'],
				id_token_signing_alg_values_supported: ['RS256'],
				code_challenge_methods_supported: ['S256']
			});
		}
		if (url.pathname === '/jwks') return json({ keys: [publicKey] });
		if (url.pathname === '/token') {
			requests.push(new URLSearchParams(init?.body as URLSearchParams));
			const idToken = await new SignJWT({
				...(nonce ? { nonce } : {}),
				email: 'member@example.com',
				email_verified: true
			})
				.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
				.setIssuer(GOOGLE_ISSUER)
				.setAudience(options.audience ?? config.clientId)
				.setSubject(options.subject ?? 'member-1')
				.setIssuedAt()
				.setExpirationTime(Math.floor(Date.now() / 1000) + (options.expired ? -120 : 3600))
				.sign(signingKey);
			return json({
				access_token: 'unused-google-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				id_token: idToken,
				refresh_token: 'test-refresh'
			});
		}
		throw new Error(`Unexpected mock OIDC endpoint: ${url.pathname}`);
	});
	vi.stubGlobal('fetch', fetch);
	return {
		requests,
		setNonce: (value: string) => {
			nonce = value;
		}
	};
}

test('Google code flow verifies a signed ID token, state, nonce and PKCE before returning identity', async () => {
	const mock = await googleMock();
	const { url, transaction } = await beginAuthorization(config);
	mock.setNonce(transaction.nonce);
	expect(url.searchParams.get('code_challenge_method')).toBe('S256');
	expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
	const result = await completeAuthorization(
		config,
		new URL(`${config.redirectUri}?code=test-code&state=${transaction.state}`),
		transaction
	);
	expect(result).toMatchObject({
		subject: 'member-1',
		email: 'member@example.com',
		refreshToken: 'test-refresh'
	});
	expect(mock.requests[0].get('code_verifier')).toBe(transaction.verifier);
	expect(mock.requests[0].get('grant_type')).toBe('authorization_code');
});

test('a substituted state is rejected before exchanging the authorization code', async () => {
	const mock = await googleMock();
	const { transaction } = await beginAuthorization(config);
	await expect(
		completeAuthorization(
			config,
			new URL(`${config.redirectUri}?code=test-code&state=attacker`),
			transaction
		)
	).rejects.toThrow();
	expect(mock.requests).toHaveLength(0);
});

test.each([
	['nonce', { nonce: 'wrong-nonce' }],
	['signature', { badSignature: true }],
	['audience', { audience: 'another-client' }],
	['expiry', { expired: true }]
] as const)('rejects an ID token with invalid %s', async (_label, options) => {
	const mock = await googleMock(options);
	const { transaction } = await beginAuthorization(config);
	if (!('nonce' in options)) mock.setNonce(transaction.nonce);
	await expect(
		completeAuthorization(
			config,
			new URL(`${config.redirectUri}?code=test-code&state=${transaction.state}`),
			transaction
		)
	).rejects.toThrow();
});

test('refresh verifies the new identity and refuses a changed subject', async () => {
	const mock = await googleMock();
	const current = {
		subject: 'member-1',
		idToken: 'old',
		idTokenExpiresAt: 1,
		refreshToken: 'test-refresh'
	};
	expect((await refreshIdentity(config, current)).subject).toBe(current.subject);
	expect(mock.requests[0].get('grant_type')).toBe('refresh_token');
	await googleMock({ subject: 'another-member' });
	await expect(refreshIdentity(config, current)).rejects.toThrow('identity changed');
});
