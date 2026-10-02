import type { AuthConfig } from 'convex/server';

function optionalEnv(name: string): string | undefined {
	try {
		return process.env[name];
	} catch (cause) {
		if (
			cause instanceof Error &&
			cause.message.includes(`Environment variable ${name}`) &&
			cause.message.includes('was not set')
		)
			return undefined;
		throw cause;
	}
}

// Backend settings are deployed separately; frontend environment variables do not propagate.
const workosClientId = optionalEnv('WORKOS_CLIENT_ID');
const googleClientId = optionalEnv('AUTH_CLIENT_ID');
const providers: AuthConfig['providers'] = [];
if (workosClientId) {
	providers.push(
		{
			type: 'customJwt',
			issuer: 'https://api.workos.com/',
			algorithm: 'RS256',
			jwks: `https://api.workos.com/sso/jwks/${workosClientId}`,
			applicationID: workosClientId
		},
		{
			type: 'customJwt',
			issuer: `https://api.workos.com/user_management/${workosClientId}`,
			algorithm: 'RS256',
			jwks: `https://api.workos.com/sso/jwks/${workosClientId}`
		}
	);
} else if (googleClientId) {
	providers.push({ domain: 'https://accounts.google.com', applicationID: googleClientId });
}

export default { providers } satisfies AuthConfig;
