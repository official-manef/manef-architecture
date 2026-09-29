import type { AuthConfig } from 'convex/server';

// Set this on the Convex deployment as well as the SvelteKit server.
function optionalClientId() {
	try {
		return process.env.AUTH_CLIENT_ID;
	} catch (cause) {
		// Convex auth configuration throws on a missing env read rather than returning undefined.
		if (
			cause instanceof Error &&
			cause.message.includes('Environment variable AUTH_CLIENT_ID') &&
			cause.message.includes('was not set')
		)
			return undefined;
		throw cause;
	}
}
const clientId = optionalClientId();

export default {
	providers: clientId ? [{ domain: 'https://accounts.google.com', applicationID: clientId }] : []
} satisfies AuthConfig;
