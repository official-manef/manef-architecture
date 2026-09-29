export function textField(value: unknown, name: string, max: number): asserts value is string {
	if (typeof value !== 'string' || !value.trim() || value.length > max || /[\r\n]/.test(value)) {
		throw new Error(`${name} must be a nonempty single line of at most ${max} characters`);
	}
}

export function httpsUrl(value: unknown, name: string): URL {
	textField(value, name, 2048);
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${name} must be an absolute HTTPS URL`);
	}
	if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
		throw new Error(`${name} must be an absolute HTTPS URL without credentials or fragment`);
	}
	return url;
}

export function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error('Invalid provider response');
	return value as Record<string, unknown>;
}

export async function postJson(
	provider: string,
	url: string,
	headers: Record<string, string>,
	body: string
): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...headers },
			body,
			signal: AbortSignal.timeout(10_000),
			redirect: 'error'
		});
	} catch {
		throw new Error(
			`${provider} request failed or timed out; outcome may be unknown, reconcile before retrying`
		);
	}
	if (!response.ok) throw new Error(`${provider} request failed (HTTP ${response.status})`);
	try {
		return await response.json();
	} catch {
		throw new Error(`Invalid ${provider} JSON response`);
	}
}
