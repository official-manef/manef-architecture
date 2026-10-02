import * as client from 'openid-client';
import type { AuthConfig } from './config';
import {
	completeWorkosAuthorization,
	refreshWorkosIdentity,
	WORKOS_ORIGIN
} from './workos';

export const GOOGLE_ISSUER = 'https://accounts.google.com';
export type AuthTransaction = {
	verifier: string;
	state: string;
	nonce: string;
	provider?: 'google' | 'workos';
	clientId?: string;
};
export type IdentityTokens = {
	subject: string;
	email?: string;
	issuer?: string;
	idToken: string;
	idTokenExpiresAt: number;
	refreshToken?: string;
};

async function configuration(config: AuthConfig) {
	return await client.discovery(
		new URL(GOOGLE_ISSUER),
		config.clientId,
		{ client_secret: config.clientSecret, id_token_signed_response_alg: 'RS256' },
		undefined,
		{ timeout: 10, execute: [client.enableNonRepudiationChecks] }
	);
}

function identity(tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers) {
	const claims = tokens.claims();
	if (!tokens.id_token || !claims || typeof claims.sub !== 'string' || !claims.sub)
		throw new Error('The identity provider did not return a verified identity.');
	return {
		subject: claims.sub,
		...(claims.email_verified === true && typeof claims.email === 'string'
			? { email: claims.email }
			: {}),
		idToken: tokens.id_token,
		idTokenExpiresAt: claims.exp,
		...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {})
	};
}

export async function beginAuthorization(config: AuthConfig) {
	const transaction: AuthTransaction = {
		verifier: client.randomPKCECodeVerifier(),
		state: client.randomState(),
		nonce: client.randomNonce(),
		provider: config.provider,
		clientId: config.clientId
	};
	if (config.provider === 'workos') {
		const url = new URL(`${WORKOS_ORIGIN}/user_management/authorize`);
		url.search = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: 'code',
			provider: 'authkit',
			state: transaction.state,
			code_challenge: await client.calculatePKCECodeChallenge(transaction.verifier),
			code_challenge_method: 'S256'
		}).toString();
		return { url, transaction };
	}
	const oidc = await configuration(config);
	const url = client.buildAuthorizationUrl(oidc, {
		redirect_uri: config.redirectUri,
		scope: 'openid email',
		code_challenge: await client.calculatePKCECodeChallenge(transaction.verifier),
		code_challenge_method: 'S256',
		state: transaction.state,
		nonce: transaction.nonce,
		access_type: 'offline',
		prompt: 'select_account'
	});
	return { url, transaction };
}

export async function completeAuthorization(
	config: AuthConfig,
	url: URL,
	transaction: AuthTransaction
): Promise<IdentityTokens> {
	if (config.provider === 'workos') return completeWorkosAuthorization(config, url, transaction);
	if (transaction.provider && transaction.provider !== config.provider)
		throw new Error('Authentication provider changed.');
	const oidc = await configuration(config);
	return identity(
		await client.authorizationCodeGrant(oidc, url, {
			pkceCodeVerifier: transaction.verifier,
			expectedState: transaction.state,
			expectedNonce: transaction.nonce,
			idTokenExpected: true
		})
	);
}

export async function refreshIdentity(
	config: AuthConfig,
	current: IdentityTokens
): Promise<IdentityTokens> {
	if (config.provider === 'workos') return refreshWorkosIdentity(config, current);
	if (!current.refreshToken) throw new Error('Sign in again to renew this session.');
	const oidc = await configuration(config);
	const tokens = await client.refreshTokenGrant(oidc, current.refreshToken);
	const next = identity(tokens);
	if (next.subject !== current.subject) throw new Error('The refreshed identity changed.');
	return { ...next, refreshToken: next.refreshToken ?? current.refreshToken };
}
