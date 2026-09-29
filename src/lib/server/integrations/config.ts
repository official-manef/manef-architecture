export type IntegrationEnv = Readonly<Record<string, string | undefined>>;
type Disabled = { enabled: false };
export type PaymentConfig =
	| Disabled
	| {
			enabled: true;
			provider: 'doku';
			environment: 'sandbox' | 'production';
			clientId: string;
			secretKey: string;
	  };
export type EmailConfig =
	| Disabled
	| {
			enabled: true;
			provider: 'resend';
			apiKey: string;
			from: string;
	  };

function enabled(env: IntegrationEnv, name: string): boolean {
	const value = env[name];
	if (value === undefined || value === '' || value === 'false') return false;
	if (value === 'true') return true;
	throw new Error(`${name} must be true or false`);
}

function required(env: IntegrationEnv, name: string): string {
	const value = env[name];
	if (!value?.trim() || /[\r\n]/.test(value))
		throw new Error(`${name} is required and must be a single line`);
	return value;
}

export function resolveIntegration(capability: 'payments', env: IntegrationEnv): PaymentConfig;
export function resolveIntegration(capability: 'email', env: IntegrationEnv): EmailConfig;
export function resolveIntegration(capability: 'gcp' | 'cloudflare', env: IntegrationEnv): Disabled;
export function resolveIntegration(
	capability: 'payments' | 'email' | 'gcp' | 'cloudflare',
	env: IntegrationEnv
): PaymentConfig | EmailConfig | Disabled {
	if (capability === 'payments') {
		if (!enabled(env, 'PAYMENTS_ENABLED')) return { enabled: false };
		const provider = env.PAYMENT_PROVIDER || 'doku';
		if (provider !== 'doku')
			throw new Error('Unsupported PAYMENT_PROVIDER; implement its adapter before enabling it');
		const environment = env.DOKU_ENVIRONMENT || 'sandbox';
		if (environment !== 'sandbox' && environment !== 'production')
			throw new Error('DOKU_ENVIRONMENT must be sandbox or production');
		return {
			enabled: true,
			provider,
			environment,
			clientId: required(env, 'DOKU_CLIENT_ID'),
			secretKey: required(env, 'DOKU_SECRET_KEY')
		};
	}
	if (capability === 'email') {
		if (!enabled(env, 'EMAIL_ENABLED')) return { enabled: false };
		const provider = env.EMAIL_PROVIDER || 'resend';
		if (provider !== 'resend')
			throw new Error('Unsupported EMAIL_PROVIDER; implement its adapter before enabling it');
		return {
			enabled: true,
			provider,
			apiKey: required(env, 'RESEND_API_KEY'),
			from: required(env, 'EMAIL_FROM')
		};
	}
	const name = { gcp: 'GCP_ENABLED', cloudflare: 'CLOUDFLARE_ENABLED' }[capability];
	if (enabled(env, name))
		throw new Error(
			`${name} requires the application integration described in docs/integrations.md`
		);
	return { enabled: false };
}
