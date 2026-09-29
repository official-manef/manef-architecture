import { error, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { z } from 'zod';
import { resolveAuthConfig, type AuthConfig } from './config';
import { GOOGLE_ISSUER, refreshIdentity, type AuthTransaction, type IdentityTokens } from './oidc';

type AuthEvent = Pick<RequestEvent, 'cookies' | 'request' | 'url'>;
export type Session = {
	subject: string;
	tokenIdentifier: string;
	email?: string;
	/** Absolute expiry as Unix milliseconds; refresh never extends this limit. */
	expiresAt: number;
};
const SESSION_SECONDS = 3600;
const TRANSACTION_SECONDS = 600;
const COOKIE_LIMIT = 3800;
const transactionSchema = z.object({
	verifier: z.string().min(43).max(128),
	state: z.string().min(32).max(128),
	nonce: z.string().min(32).max(128)
});
const recordSchema = z.object({
	subject: z.string().min(1).max(255),
	email: z.string().max(320).optional(),
	idToken: z.string().min(1),
	idTokenExpiresAt: z.number(),
	refreshToken: z.string().optional(),
	expiresAt: z.number()
});
type SessionRecord = z.infer<typeof recordSchema>;

export function authConfiguration() {
	return resolveAuthConfig({ ...env, ...publicEnv });
}

export function configuredAuth(): AuthConfig {
	const config = authConfiguration();
	if (!config.enabled) error(404, 'Sign-in is not enabled.');
	return config;
}

function cookieName(config: AuthConfig, purpose: 'session' | 'transaction') {
	return `${config.secure ? '__Host-' : ''}starter-${purpose}`;
}

function cookieOptions(config: AuthConfig) {
	return { path: '/', httpOnly: true, secure: config.secure, sameSite: 'lax' as const };
}

async function seal(config: AuthConfig, purpose: string, data: object, expiresAt: number) {
	return await new EncryptJWT({ ...data })
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.setIssuer(config.origin)
		.setAudience(`starter-${purpose}`)
		.setIssuedAt()
		.setExpirationTime(expiresAt)
		.encrypt(config.sessionKey);
}

async function unseal(config: AuthConfig, purpose: string, value: string | undefined) {
	if (!value || value.length > COOKIE_LIMIT) return null;
	try {
		const { payload } = await jwtDecrypt(value, config.sessionKey, {
			issuer: config.origin,
			audience: `starter-${purpose}`,
			keyManagementAlgorithms: ['dir'],
			contentEncryptionAlgorithms: ['A256GCM']
		});
		return payload;
	} catch {
		return null;
	}
}

export async function saveTransaction(
	event: AuthEvent,
	config: AuthConfig,
	transaction: AuthTransaction
) {
	event.cookies.set(
		cookieName(config, 'transaction'),
		await seal(
			config,
			'transaction',
			transaction,
			Math.floor(Date.now() / 1000) + TRANSACTION_SECONDS
		),
		{ ...cookieOptions(config), maxAge: TRANSACTION_SECONDS }
	);
}

export async function consumeTransaction(event: AuthEvent, config: AuthConfig) {
	const name = cookieName(config, 'transaction');
	const raw = event.cookies.get(name);
	event.cookies.delete(name, cookieOptions(config));
	const parsed = transactionSchema.safeParse(await unseal(config, 'transaction', raw));
	return parsed.success ? parsed.data : null;
}

async function saveRecord(event: AuthEvent, config: AuthConfig, record: SessionRecord) {
	let value = await seal(config, 'session', record, record.expiresAt);
	// Google may return a large refresh token. Keep the bounded sign-in usable without renewal.
	if (value.length > COOKIE_LIMIT && record.refreshToken) {
		delete record.refreshToken;
		value = await seal(config, 'session', record, record.expiresAt);
	}
	if (value.length > COOKIE_LIMIT)
		throw new Error('The identity response exceeds the session limit.');
	event.cookies.set(cookieName(config, 'session'), value, {
		...cookieOptions(config),
		maxAge: Math.max(0, record.expiresAt - Math.floor(Date.now() / 1000))
	});
}

export async function establishSession(
	event: AuthEvent,
	config: AuthConfig,
	tokens: IdentityTokens
) {
	await saveRecord(event, config, {
		...tokens,
		expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS
	});
}

export function clearSession(event: AuthEvent, config: AuthConfig) {
	event.cookies.delete(cookieName(config, 'session'), cookieOptions(config));
	event.cookies.delete(cookieName(config, 'transaction'), cookieOptions(config));
}

async function readRecord(
	event: AuthEvent,
	forceRefreshToken = false
): Promise<SessionRecord | null> {
	const config = authConfiguration();
	if (!config.enabled) return null;
	const raw = event.cookies.get(cookieName(config, 'session'));
	if (!raw) return null;
	const parsed = recordSchema.safeParse(await unseal(config, 'session', raw));
	if (!parsed.success) {
		clearSession(event, config);
		return null;
	}
	let record = parsed.data;
	const now = Math.floor(Date.now() / 1000);
	if (record.expiresAt <= now) {
		clearSession(event, config);
		return null;
	}
	if (record.refreshToken && (forceRefreshToken || record.idTokenExpiresAt <= now + 60)) {
		try {
			record = { ...(await refreshIdentity(config, record)), expiresAt: record.expiresAt };
			await saveRecord(event, config, record);
		} catch {
			clearSession(event, config);
			return null;
		}
	}
	if (record.idTokenExpiresAt <= now) {
		clearSession(event, config);
		return null;
	}
	return record;
}

export async function readSession(event: AuthEvent): Promise<Session | null> {
	const record = await readRecord(event);
	if (!record) return null;
	return {
		subject: record.subject,
		tokenIdentifier: `${GOOGLE_ISSUER}|${record.subject}`,
		...(record.email ? { email: record.email } : {}),
		expiresAt: record.expiresAt * 1000
	};
}

export async function requireSession(event: AuthEvent): Promise<Session> {
	const session = await readSession(event);
	if (!session) error(401, 'Sign in to continue.');
	return session;
}

export async function getConvexToken(
	event: AuthEvent,
	options: { forceRefreshToken?: boolean } = {}
): Promise<string | null> {
	return (await readRecord(event, options.forceRefreshToken))?.idToken ?? null;
}
