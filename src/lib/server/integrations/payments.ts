import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { resolveIntegration, type IntegrationEnv } from './config';
import { httpsUrl, postJson, record, textField } from './http';

export type CheckoutInput = {
	/** Persist this attempt ID before sending; reuse it when reconciling/retrying. */
	requestId: string;
	invoice: string;
	amount: number;
	currency: 'IDR';
	/** Server-selected URL. Never accept a return URL directly from an untrusted client. */
	callbackUrl: string;
};

type SignatureInput = {
	clientId: string;
	requestId: string;
	timestamp: string;
	target: string;
	body: string;
};

/** DOKU Checkout's non-SNAP signature; do not use for SNAP or payout APIs. */
export function signDokuRequest(input: SignatureInput, secretKey: string): string {
	textField(input.clientId, 'Client-Id', 128);
	textField(input.requestId, 'Request-Id', 128);
	textField(input.timestamp, 'Request-Timestamp', 40);
	textField(input.target, 'Request-Target', 2048);
	if (
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.timestamp) ||
		!Number.isFinite(Date.parse(input.timestamp))
	) {
		throw new Error('Request-Timestamp must use ISO 8601 UTC');
	}
	if (!input.target.startsWith('/') || input.target.startsWith('//') || /[?#]/.test(input.target)) {
		throw new Error('Request-Target must be the exact endpoint path without query or fragment');
	}
	if (!secretKey || typeof input.body !== 'string')
		throw new Error('DOKU signing requires a secret and serialized body');
	const digest = createHash('sha256').update(input.body, 'utf8').digest('base64');
	const message = [
		`Client-Id:${input.clientId}`,
		`Request-Id:${input.requestId}`,
		`Request-Timestamp:${input.timestamp}`,
		`Request-Target:${input.target}`,
		`Digest:${digest}`
	].join('\n');
	return `HMACSHA256=${createHmac('sha256', secretKey).update(message, 'utf8').digest('base64')}`;
}

/** Creates only a hosted checkout session; it does not persist an order or confirm payment. */
export async function createCheckout(env: IntegrationEnv, input: CheckoutInput) {
	const config = resolveIntegration('payments', env);
	if (!config.enabled) throw new Error('Payments are disabled');
	textField(input.requestId, 'requestId', 128);
	// Thirty alphanumeric characters also fit credit-card and KKI invoice restrictions.
	if (typeof input.invoice !== 'string' || !/^[A-Za-z0-9]{1,30}$/.test(input.invoice))
		throw new Error('invoice must contain 1–30 letters or digits');
	if (
		!Number.isSafeInteger(input.amount) ||
		input.amount <= 0 ||
		input.amount > 999_999_999_999 ||
		input.currency !== 'IDR'
	) {
		throw new Error('DOKU Checkout requires a positive integer IDR amount of at most 12 digits');
	}
	httpsUrl(input.callbackUrl, 'callbackUrl');
	const target = '/checkout/v1/payment';
	const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
	const body = JSON.stringify({
		order: {
			amount: input.amount,
			invoice_number: input.invoice,
			currency: input.currency,
			callback_url: input.callbackUrl,
			auto_redirect: true
		},
		// Explicit basic methods: no PayLater/customer/shipping fields are implemented here.
		payment: { payment_method_types: ['VIRTUAL_ACCOUNT_BCA', 'QRIS'] }
	});
	const data = record(
		await postJson(
			'DOKU',
			`https://${config.environment === 'sandbox' ? 'api-sandbox' : 'api'}.doku.com${target}`,
			{
				'Client-Id': config.clientId,
				'Request-Id': input.requestId,
				'Request-Timestamp': timestamp,
				Signature: signDokuRequest(
					{ clientId: config.clientId, requestId: input.requestId, timestamp, target, body },
					config.secretKey
				)
			},
			body
		)
	);
	if (!Array.isArray(data.message) || !data.message.includes('SUCCESS')) {
		throw new Error('DOKU did not confirm checkout creation');
	}
	const response = record(data.response);
	const order = record(response.order);
	const payment = record(response.payment);
	if (
		order.invoice_number !== input.invoice ||
		String(order.amount) !== String(input.amount) ||
		(order.currency !== undefined && order.currency !== input.currency)
	) {
		throw new Error('DOKU response does not match the checkout order');
	}
	const url = httpsUrl(payment.url, 'DOKU checkout URL');
	const expectedHost = config.environment === 'sandbox' ? 'sandbox.doku.com' : 'jokul.doku.com';
	if (url.hostname !== expectedHost || url.port) throw new Error('Unexpected DOKU checkout host');
	textField(payment.token_id, 'DOKU checkout token', 1024);
	return {
		provider: config.provider,
		checkoutUrl: url.href,
		reference: payment.token_id,
		requestId: input.requestId
	};
}

/** Verifies authenticity only. The caller must durably dedupe and authorize order transitions. */
export function verifyPaymentNotification(
	env: IntegrationEnv,
	input: { headers: Headers; rawBody: string; path: string }
): boolean {
	const config = resolveIntegration('payments', env);
	if (!config.enabled) throw new Error('Payments are disabled');
	if (typeof input.rawBody !== 'string' || Buffer.byteLength(input.rawBody, 'utf8') > 1_048_576)
		return false;
	const signature = input.headers.get('Signature');
	if (
		!signature ||
		!/^HMACSHA256=[A-Za-z0-9+/]{43}=$/.test(signature) ||
		input.headers.get('Client-Id') !== config.clientId
	)
		return false;
	try {
		const expected = signDokuRequest(
			{
				clientId: config.clientId,
				requestId: input.headers.get('Request-Id') ?? '',
				timestamp: input.headers.get('Request-Timestamp') ?? '',
				target: input.path,
				body: input.rawBody
			},
			config.secretKey
		);
		return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
	} catch {
		return false;
	}
}
