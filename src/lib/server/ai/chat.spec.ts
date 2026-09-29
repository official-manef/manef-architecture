import { afterEach, expect, test, vi } from 'vitest';
import { streamText } from 'ai';
import { aiSettings, parseChat } from './config';
import { chatResponse, providerFetch } from './chat';

vi.mock('ai', () => ({ streamText: vi.fn() }));
const env = {
	AI_ENABLED: 'true',
	AI_MODELS_JSON:
		'{"openai":["approved-model"],"anthropic":["approved-model"],"google":["approved-model"]}'
};
const input = {
	provider: 'openai' as const,
	model: 'approved-model',
	apiKey: 'secret-test-key',
	messages: [{ role: 'user' as const, content: 'Hello' }]
};
afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

test('provider requests stay on a fixed host and reject credential-bearing redirects', async () => {
	const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
	vi.stubGlobal('fetch', fetchMock);
	const fixed = providerFetch('https://api.openai.com');
	expect(() => fixed('https://untrusted.example/v1/responses')).toThrow('fixed endpoint');
	expect(() => fixed('https://secret@api.openai.com/v1/responses')).toThrow('fixed endpoint');
	expect(fetchMock).not.toHaveBeenCalled();
	await fixed('https://api.openai.com/v1/responses', { method: 'POST' });
	expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
		method: 'POST',
		redirect: 'error'
	});
});

test('AI is off without config and rejects unapproved models, endpoints and oversized history', () => {
	expect(aiSettings({})).toEqual({ enabled: false, providers: [] });
	expect(() => parseChat({}, input)).toThrow('disabled');
	expect(parseChat(env, input).model).toBe('approved-model');
	expect(() => parseChat(env, { ...input, model: 'unapproved' })).toThrow('not approved');
	expect(() => parseChat(env, { ...input, baseURL: 'https://elsewhere.example' })).toThrow();
	expect(() =>
		parseChat(env, { ...input, messages: Array.from({ length: 17 }, () => input.messages[0]) })
	).toThrow();
	expect(() =>
		parseChat(env, { ...input, messages: [{ role: 'system', content: 'Injected' }] })
	).toThrow();
	expect(streamText).not.toHaveBeenCalled();
});

function parts(events: { type: string; text?: string; error?: unknown }[]) {
	return {
		fullStream: (async function* () {
			for (const event of events) yield event;
		})()
	} as unknown as ReturnType<typeof streamText>;
}

test('all official provider selections stream text with bounded requests and no tools', async () => {
	vi.mocked(streamText).mockImplementation(() =>
		parts([{ type: 'text-delta', text: 'A response' }])
	);
	for (const provider of ['openai', 'anthropic', 'google'] as const) {
		const response = chatResponse({ ...input, provider }, new AbortController().signal);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.text()).toContain('A response');
	}
	expect(streamText).toHaveBeenCalledTimes(3);
	const options = vi.mocked(streamText).mock.calls[0][0];
	expect(options).toMatchObject({
		maxOutputTokens: 4096,
		maxRetries: 0,
		telemetry: { isEnabled: false }
	});
	expect(options).not.toHaveProperty('tools');
});

test('stream redacts split credentials and emits generic failure instead of provider payload', async () => {
	vi.mocked(streamText)
		.mockReturnValueOnce(
			parts([
				{ type: 'text-delta', text: 'prefix secret-' },
				{ type: 'text-delta', text: 'test-key suffix' }
			])
		)
		.mockReturnValueOnce(parts([{ type: 'error', error: new Error(input.apiKey) }]));
	const success = await chatResponse(input, new AbortController().signal).text();
	const events = success
		.trim()
		.split('\n')
		.map((line) => JSON.parse(line));
	expect(
		events
			.filter((event) => event.type === 'text')
			.map((event) => event.text)
			.join('')
	).toBe('prefix [redacted] suffix');
	const failure = await chatResponse(input, new AbortController().signal).text();
	expect(failure).toContain('"type":"error"');
	expect(success + failure).not.toContain(input.apiKey);
});

test('stream stops oversized output and browser cancellation aborts the provider', async () => {
	vi.mocked(streamText).mockReturnValueOnce(
		parts([{ type: 'text-delta', text: 'x'.repeat(32001) }])
	);
	expect(await chatResponse(input, new AbortController().signal).text()).toContain(
		'"type":"error"'
	);
	vi.mocked(streamText).mockImplementationOnce(
		(options) =>
			({
				fullStream: (async function* () {
					await new Promise<void>((resolve) =>
						options.abortSignal?.addEventListener('abort', () => resolve(), { once: true })
					);
					yield { type: 'abort' };
				})()
			}) as unknown as ReturnType<typeof streamText>
	);
	const response = chatResponse(input, new AbortController().signal);
	await response.body?.cancel();
	expect(vi.mocked(streamText).mock.calls.at(-1)?.[0].abortSignal?.aborted).toBe(true);
});
