import { beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	consumeBurst,
	matchesSecret,
	readJsonBody,
	requireAppOrigin,
	requireCapabilityAccess
} from './access';

const state = vi.hoisted(() => ({ env: { CAPABILITY_ACCESS_TOKEN: '' }, session: vi.fn() }));
vi.mock('$env/dynamic/private', () => ({ env: state.env }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_SITE_URL: 'https://app.example' } }));
vi.mock('$lib/server/auth/session', () => ({ readSession: state.session }));
beforeEach(() => {
	state.env.CAPABILITY_ACCESS_TOKEN = '';
	state.session.mockReset().mockResolvedValue(null);
});

test('access secrets and origins reject missing, different and unsafe values', () => {
	expect(matchesSecret('secret', 'secret')).toBe(true);
	expect(matchesSecret('secret', 'secret-longer')).toBe(false);
	expect(matchesSecret('', '')).toBe(false);
	const request = new Request('https://app.example/api', {
		headers: { origin: 'https://app.example' }
	});
	expect(() => requireAppOrigin(request, 'https://app.example')).not.toThrow();
	for (const origin of [undefined, 'https://app.example/path', 'http://app.example'])
		expect(() => requireAppOrigin(request, origin)).toThrow();
	expect(() => requireAppOrigin(new Request(request.url), 'https://app.example')).toThrow();
});

test('JSON reader checks actual UTF-8 bytes, JSON and media type', async () => {
	const request = (body: BodyInit, type = 'application/json') =>
		new Request('https://app.example/api', {
			method: 'POST',
			headers: { 'content-type': type },
			body
		});
	await expect(readJsonBody(request('{"ok":true}'))).resolves.toEqual({ ok: true });
	await expect(readJsonBody(request('"é"'), 3)).rejects.toMatchObject({ status: 413 });
	await expect(readJsonBody(request(new Uint8Array([0xff])))).rejects.toMatchObject({
		status: 400
	});
	await expect(readJsonBody(request('{'))).rejects.toMatchObject({ status: 400 });
	await expect(readJsonBody(request('{}', 'text/plain'))).rejects.toMatchObject({ status: 415 });
});

test('capability access requires a session or configured operator token and same origin', async () => {
	const event = (token = '', origin = 'https://app.example') =>
		({
			request: new Request('https://app.example/api', {
				method: 'POST',
				headers: { origin, authorization: `Bearer ${token}` }
			})
		}) as RequestEvent;
	await expect(requireCapabilityAccess(event())).rejects.toMatchObject({ status: 401 });
	state.env.CAPABILITY_ACCESS_TOKEN = 'x'.repeat(32);
	await expect(requireCapabilityAccess(event('x'.repeat(32)))).resolves.toBeUndefined();
	await expect(
		requireCapabilityAccess(event('x'.repeat(32), 'https://evil.example'))
	).rejects.toMatchObject({ status: 403 });
	state.session.mockResolvedValue({ tokenIdentifier: 'https://issuer.example|one' });
	await expect(requireCapabilityAccess(event())).resolves.toBeUndefined();
});

test('burst protection is isolated by identity and expires', () => {
	const id = crypto.randomUUID();
	const now = Date.now();
	for (let i = 0; i < 20; i++) consumeBurst(id, now);
	expect(() => consumeBurst(id, now)).toThrow();
	expect(() => consumeBurst(`${id}-other`, now)).not.toThrow();
	expect(() => consumeBurst(id, now + 60_000)).not.toThrow();
});
