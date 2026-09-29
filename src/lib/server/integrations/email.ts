import { resolveIntegration, type IntegrationEnv } from './config';
import { postJson, record, textField } from './http';

export type EmailInput = {
	to: string[];
	subject: string;
	text: string;
	html?: string;
	/** Stable logical delivery ID; reuse only with the identical message. */
	idempotencyKey: string;
};

function address(value: unknown, name: string) {
	textField(value, name, 320);
	const match = /^(?:[^<>]+<([^<>]+)>|([^<>]+))$/.exec(value);
	if (!match || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test((match[1] ?? match[2]).trim())) {
		throw new Error(`${name} must be an email address or Name <email> address`);
	}
}

/** Sends a prepared transactional message; no public sending endpoint or outbox is installed. */
export async function sendEmail(env: IntegrationEnv, input: EmailInput) {
	const config = resolveIntegration('email', env);
	if (!config.enabled) throw new Error('Email is disabled');
	address(config.from, 'EMAIL_FROM');
	if (!Array.isArray(input.to) || input.to.length < 1 || input.to.length > 50)
		throw new Error('Email requires 1–50 recipients');
	for (const recipient of input.to) address(recipient, 'recipient');
	textField(input.subject, 'subject', 998);
	textField(input.idempotencyKey, 'idempotencyKey', 256);
	if (
		typeof input.text !== 'string' ||
		!input.text.trim() ||
		Buffer.byteLength(input.text, 'utf8') > 1_000_000 ||
		(input.html !== undefined &&
			(typeof input.html !== 'string' || Buffer.byteLength(input.html, 'utf8') > 1_000_000))
	) {
		throw new Error('Email requires plain text; text and optional HTML must each be at most 1 MB');
	}
	const data = record(
		await postJson(
			'Resend',
			'https://api.resend.com/emails',
			{
				Authorization: `Bearer ${config.apiKey}`,
				'Idempotency-Key': input.idempotencyKey
			},
			JSON.stringify({
				from: config.from,
				to: input.to,
				subject: input.subject,
				text: input.text,
				...(input.html === undefined ? {} : { html: input.html })
			})
		)
	);
	textField(data.id, 'Resend message ID', 256);
	return { provider: config.provider, messageId: data.id };
}
