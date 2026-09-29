import { siteOrigin } from '$lib/config/metadata';

export type AuthConfig = {
	enabled: true;
	provider: 'google';
	clientId: string;
	clientSecret: string;
	sessionKey: Uint8Array;
	origin: string;
	redirectUri: string;
	secure: boolean;
};

export function resolveAuthConfig(
	env: Readonly<Record<string, string | undefined>>
): { enabled: false } | AuthConfig {
	const flag = env.AUTH_ENABLED || 'false';
	if (flag === 'false') return { enabled: false };
	if (flag !== 'true') throw new Error('AUTH_ENABLED must be true or false.');
	if ((env.AUTH_PROVIDER || 'google') !== 'google')
		throw new Error('Unsupported AUTH_PROVIDER; implement and verify its OIDC integration first.');
	const required = (key: string) => {
		const value = env[key];
		if (!value?.trim() || /[\r\n]/.test(value)) throw new Error(`${key} is required.`);
		return value;
	};
	const secret = required('AUTH_SESSION_SECRET');
	if (!/^[A-Za-z0-9_-]{43}$/.test(secret) || Buffer.from(secret, 'base64url').length !== 32)
		throw new Error('AUTH_SESSION_SECRET must be 32 random bytes encoded as base64url.');
	const origin = siteOrigin(required('PUBLIC_SITE_URL'))!;
	return {
		enabled: true,
		provider: 'google',
		clientId: required('AUTH_CLIENT_ID'),
		clientSecret: required('AUTH_CLIENT_SECRET'),
		sessionKey: new Uint8Array(Buffer.from(secret, 'base64url')),
		origin,
		redirectUri: `${origin}/auth/callback`,
		secure: new URL(origin).protocol === 'https:'
	};
}
