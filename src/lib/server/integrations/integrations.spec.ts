import { afterEach, expect, test, vi } from 'vitest';
import { resolveIntegration } from './config';
import { sendEmail } from './email';
import { createCheckout, signDokuRequest, verifyPaymentNotification } from './payments';

const paymentEnv = {
	PAYMENTS_ENABLED: 'true',
	DOKU_CLIENT_ID: 'merchant-test',
	DOKU_SECRET_KEY: 'test-secret'
};
const emailEnv = {
	EMAIL_ENABLED: 'true',
	RESEND_API_KEY: 'test-secret',
	EMAIL_FROM: 'Starter <hello@example.com>'
};
const checkout = {
	requestId: 'attempt-test',
	invoice: 'INV20260101',
	amount: 150000,
	currency: 'IDR' as const,
	callbackUrl: 'https://example.com/orders/result'
};
const email = {
	to: ['reader@example.com'],
	subject: 'Receipt',
	text: 'Your order was received.',
	idempotencyKey: 'receipt/order1'
};
const rawBody = '{"order":{"invoice_number":"INV20260101","amount":150000}}';
const signatureInput = {
	clientId: 'merchant-test',
	requestId: 'attempt-test',
	timestamp: '2026-01-01T00:00:00Z',
	target: '/payments/notifications',
	body: rawBody
};
// Independently calculated with Python hashlib + hmac, not the adapter under test.
const knownSignature = 'HMACSHA256=obzbZ3/kfl1ufuTjwJaFVOj4I6E9a60iAMGTJdUKuFs=';
const notificationHeaders = () =>
	new Headers({
		'Client-Id': 'merchant-test',
		'Request-Id': 'attempt-test',
		'Request-Timestamp': '2026-01-01T00:00:00Z',
		Signature: knownSignature
	});

afterEach(() => vi.unstubAllGlobals());

test('default integrations stay off without secrets or network access', async () => {
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);
	expect(resolveIntegration('payments', {})).toEqual({ enabled: false });
	expect(resolveIntegration('email', {})).toEqual({ enabled: false });
	expect(resolveIntegration('gcp', {})).toEqual({ enabled: false });
	expect(resolveIntegration('cloudflare', {})).toEqual({ enabled: false });
	await expect(createCheckout({}, checkout)).rejects.toThrow('Payments are disabled');
	await expect(sendEmail({}, email)).rejects.toThrow('Email is disabled');
	expect(fetch).not.toHaveBeenCalled();
});

test('enabled capabilities fail on missing, unknown, malformed, or unimplemented configuration', () => {
	expect(() => resolveIntegration('payments', { PAYMENTS_ENABLED: 'true' })).toThrow(
		'DOKU_CLIENT_ID'
	);
	expect(() => resolveIntegration('email', { EMAIL_ENABLED: 'true' })).toThrow('RESEND_API_KEY');
	expect(() =>
		resolveIntegration('payments', { ...paymentEnv, PAYMENT_PROVIDER: 'unknown' })
	).toThrow('Unsupported PAYMENT_PROVIDER');
	expect(() => resolveIntegration('email', { ...emailEnv, EMAIL_PROVIDER: 'unknown' })).toThrow(
		'Unsupported EMAIL_PROVIDER'
	);
	expect(() => resolveIntegration('payments', { ...paymentEnv, DOKU_ENVIRONMENT: 'live' })).toThrow(
		'DOKU_ENVIRONMENT'
	);
	expect(() => resolveIntegration('email', { EMAIL_ENABLED: 'yes' })).toThrow('true or false');
	expect(() => resolveIntegration('gcp', { GCP_ENABLED: 'true' })).toThrow(
		'application integration'
	);
	expect(() => resolveIntegration('cloudflare', { CLOUDFLARE_ENABLED: 'true' })).toThrow(
		'application integration'
	);
	expect(resolveIntegration('payments', paymentEnv)).toMatchObject({
		provider: 'doku',
		environment: 'sandbox'
	});
});

test('recipe settings do not silently activate cloud services', () => {
	const env = {
		GCP_PROJECT_ID: 'test-project',
		GCP_LOCATION: 'test-location',
		GCP_STORAGE_BUCKET: 'test-bucket',
		GOOGLE_APPLICATION_CREDENTIALS: '/local/adc-config.json',
		CLOUDFLARE_ACCOUNT_ID: 'test-account',
		CLOUDFLARE_ZONE_ID: 'test-zone',
		CLOUDFLARE_API_TOKEN: 'test-token'
	};
	for (const capability of ['gcp', 'cloudflare'] as const) {
		expect(resolveIntegration(capability, env)).toEqual({ enabled: false });
	}
	expect(() => resolveIntegration('cloudflare', { CLOUDFLARE_ENABLED: 'yes' })).toThrow(
		'true or false'
	);
});

test('DOKU signature matches independent vector and notification tampering fails', () => {
	expect(signDokuRequest(signatureInput, 'test-secret')).toBe(knownSignature);
	const notification = { headers: notificationHeaders(), rawBody, path: signatureInput.target };
	expect(verifyPaymentNotification(paymentEnv, notification)).toBe(true);
	expect(
		verifyPaymentNotification(paymentEnv, {
			...notification,
			rawBody: rawBody.replace('150000', '1')
		})
	).toBe(false);
	expect(verifyPaymentNotification(paymentEnv, { ...notification, rawBody: `${rawBody}\n` })).toBe(
		false
	);
	expect(verifyPaymentNotification(paymentEnv, { ...notification, path: '/wrong/path' })).toBe(
		false
	);
	const headers = notificationHeaders();
	headers.set('Client-Id', 'different-merchant');
	expect(verifyPaymentNotification(paymentEnv, { ...notification, headers })).toBe(false);
	headers.set('Signature', 'HMACSHA256=invalid');
	expect(verifyPaymentNotification(paymentEnv, { ...notification, headers })).toBe(false);
});

function checkoutResponse(overrides: Record<string, unknown> = {}) {
	return Response.json({
		message: ['SUCCESS'],
		response: {
			order: { amount: '150000', invoice_number: checkout.invoice, currency: 'IDR', ...overrides },
			payment: { url: 'https://sandbox.doku.com/checkout-link-v2/test', token_id: 'session-test' }
		}
	});
}

test('DOKU sends the server-priced basic order with the persisted attempt ID and finite timeout', async () => {
	const fetch = vi.fn().mockImplementation(() => Promise.resolve(checkoutResponse()));
	vi.stubGlobal('fetch', fetch);
	const first = await createCheckout(paymentEnv, checkout);
	await createCheckout(paymentEnv, checkout);
	expect(first).toEqual({
		provider: 'doku',
		checkoutUrl: 'https://sandbox.doku.com/checkout-link-v2/test',
		reference: 'session-test',
		requestId: 'attempt-test'
	});
	const [url, request] = fetch.mock.calls[0];
	expect(url).toBe('https://api-sandbox.doku.com/checkout/v1/payment');
	expect(request.headers['Request-Id']).toBe('attempt-test');
	expect(fetch.mock.calls[1][1].headers['Request-Id']).toBe('attempt-test');
	expect(fetch.mock.calls[1][1].body).toBe(request.body);
	expect(request.headers.Signature).toMatch(/^HMACSHA256=/);
	expect(request.signal).toBeInstanceOf(AbortSignal);
	expect(request.redirect).toBe('error');
	expect(JSON.parse(request.body)).toEqual({
		order: {
			amount: 150000,
			invoice_number: 'INV20260101',
			currency: 'IDR',
			callback_url: checkout.callbackUrl,
			auto_redirect: true
		},
		payment: { payment_method_types: ['VIRTUAL_ACCOUNT_BCA', 'QRIS'] }
	});
});

test('invalid payment values cannot reach the provider; mismatched replies are rejected', async () => {
	const fetch = vi
		.fn()
		.mockImplementation(() => Promise.resolve(checkoutResponse({ amount: '1' })));
	vi.stubGlobal('fetch', fetch);
	for (const amount of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER])
		await expect(createCheckout(paymentEnv, { ...checkout, amount })).rejects.toThrow(
			'integer IDR'
		);
	await expect(
		createCheckout(paymentEnv, { ...checkout, callbackUrl: 'javascript:alert(1)' })
	).rejects.toThrow('HTTPS');
	await expect(createCheckout(paymentEnv, { ...checkout, invoice: '../invalid' })).rejects.toThrow(
		'invoice'
	);
	expect(fetch).not.toHaveBeenCalled();
	await expect(createCheckout(paymentEnv, checkout)).rejects.toThrow('does not match');
});

test('Resend sends an identical payload and stable idempotency key on retry', async () => {
	const fetch = vi
		.fn()
		.mockImplementation(() => Promise.resolve(Response.json({ id: 'email-123' })));
	vi.stubGlobal('fetch', fetch);
	expect(await sendEmail(emailEnv, email)).toEqual({ provider: 'resend', messageId: 'email-123' });
	await sendEmail(emailEnv, email);
	const [url, request] = fetch.mock.calls[0];
	expect(url).toBe('https://api.resend.com/emails');
	expect(request.headers['Idempotency-Key']).toBe('receipt/order1');
	expect(fetch.mock.calls[1][1].body).toBe(request.body);
	expect(fetch.mock.calls[1][1].headers['Idempotency-Key']).toBe(
		request.headers['Idempotency-Key']
	);
	expect(JSON.parse(request.body)).toEqual({
		from: emailEnv.EMAIL_FROM,
		to: email.to,
		subject: email.subject,
		text: email.text
	});
	await expect(sendEmail(emailEnv, { ...email, idempotencyKey: '' })).rejects.toThrow(
		'idempotencyKey'
	);
	await expect(
		sendEmail(emailEnv, { ...email, to: ['bad\r\nBcc: other@example.com'] })
	).rejects.toThrow('recipient');
	expect(fetch).toHaveBeenCalledTimes(2);
});

test('provider failures never return fake success or echo response secrets', async () => {
	const fetch = vi
		.fn()
		.mockResolvedValueOnce(new Response('test-secret', { status: 429 }))
		.mockResolvedValueOnce(Response.json({ unexpected: true }))
		.mockRejectedValueOnce(new Error('test-secret'));
	vi.stubGlobal('fetch', fetch);
	await expect(sendEmail(emailEnv, email)).rejects.toThrow('Resend request failed (HTTP 429)');
	await expect(sendEmail(emailEnv, email)).rejects.toThrow('Resend message ID');
	await expect(sendEmail(emailEnv, email)).rejects.toThrow('outcome may be unknown');
});
