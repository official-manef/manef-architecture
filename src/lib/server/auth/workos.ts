import { timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { z } from 'zod';
import type { AuthConfig } from './config';
import type { AuthTransaction, IdentityTokens } from './oidc';

export const WORKOS_ORIGIN = 'https://api.workos.com';
const authenticationSchema = z.object({
	user: z.object({
		id: z.string().min(1).max(255),
		email: z.string().max(320).optional(),
		email_verified: z.boolean().optional()
	}),
	access_token: z.string().min(1).max(16000),
	refresh_token: z.string().min(1).max(16000).optional()
});

export async function verifyWorkosAccessToken(
	config: AuthConfig,
	token: string,
	subject?: string
) {
	// Decoding selects a fixed validation policy; claims are not trusted before verification.
	const untrusted = decodeJwt(token);
	const scopedIssuer = `${WORKOS_ORIGIN}/user_management/${config.clientId}`;
	const legacyIssuer = `${WORKOS_ORIGIN}/`;
	const legacy = untrusted.iss === legacyIssuer;
	if (!legacy && untrusted.iss !== scopedIssuer)
		throw new Error('Invalid WorkOS token issuer.');
	const jwks = createRemoteJWKSet(
		new URL(`${WORKOS_ORIGIN}/sso/jwks/${encodeURIComponent(config.clientId)}`),
		{ timeoutDuration: 10000 }
	);
	const { payload } = await jwtVerify(token, jwks, {
		issuer: legacy ? legacyIssuer : scopedIssuer,
		algorithms: ['RS256'],
		requiredClaims: ['sub', 'exp', 'iat', 'sid'],
		// Shared issuers require an audience. Scoped issuers bind the application in iss.
		...(legacy || untrusted.aud !== undefined ? { audience: config.clientId } : {})
	});
	if (
		typeof payload.sub !== 'string' ||
		!payload.sub ||
		typeof payload.exp !== 'number' ||
		typeof payload.sid !== 'string' ||
		!payload.sid ||
		(subject !== undefined && payload.sub !== subject)
	)
		throw new Error('Invalid WorkOS identity.');
	return payload;
}

async function authenticate(
	config: AuthConfig,
	grant: Record<string, string>
): Promise<IdentityTokens> {
	const response = await fetch(`${WORKOS_ORIGIN}/user_management/authenticate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			...grant
		}),
		signal: AbortSignal.timeout(10000),
		redirect: 'error'
	});
	if (!response.ok) throw new Error('WorkOS could not complete authentication.');
	const text = await response.text();
	if (text.length > 64000) throw new Error('WorkOS authentication response is too large.');
	const result = authenticationSchema.parse(JSON.parse(text));
	const claims = await verifyWorkosAccessToken(config, result.access_token, result.user.id);
	return {
		subject: result.user.id,
		issuer: claims.iss!,
		...(result.user.email_verified === true && result.user.email
			? { email: result.user.email }
			: {}),
		// Preserve the internal adapter shape; WorkOS supplies an access JWT, not a Google ID token.
		idToken: result.access_token,
		idTokenExpiresAt: claims.exp!,
		...(result.refresh_token ? { refreshToken: result.refresh_token } : {})
	};
}

export async function completeWorkosAuthorization(
	config: AuthConfig,
	url: URL,
	transaction: AuthTransaction
): Promise<IdentityTokens> {
	const states = url.searchParams.getAll('state');
	const codes = url.searchParams.getAll('code');
	const expected = Buffer.from(transaction.state);
	const received = Buffer.from(states[0] ?? '');
	if (
		url.origin !== config.origin ||
		url.pathname !== '/auth/callback' ||
		url.searchParams.has('error') ||
		states.length !== 1 ||
		codes.length !== 1 ||
		!codes[0] ||
		codes[0].length > 4096 ||
		received.length !== expected.length ||
		!timingSafeEqual(expected, received) ||
		transaction.provider !== 'workos' ||
		transaction.clientId !== config.clientId
	)
		throw new Error('Invalid WorkOS authorization transaction.');
	return authenticate(config, {
		grant_type: 'authorization_code',
		code: codes[0],
		code_verifier: transaction.verifier
	});
}

export async function refreshWorkosIdentity(
	config: AuthConfig,
	current: IdentityTokens
): Promise<IdentityTokens> {
	if (!current.refreshToken) throw new Error('Sign in again to renew this session.');
	const next = await authenticate(config, {
		grant_type: 'refresh_token',
		refresh_token: current.refreshToken
	});
	if (next.subject !== current.subject) throw new Error('The refreshed identity changed.');
	return { ...next, refreshToken: next.refreshToken ?? current.refreshToken };
}
