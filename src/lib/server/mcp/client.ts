import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../../../../package.json';
import type { McpConnection } from './config';

export function redact(value: unknown, secrets: string[]): unknown {
	if (typeof value === 'string')
		return secrets
			.filter(Boolean)
			.reduce((text, secret) => text.split(secret).join('[redacted]'), value);
	if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
	if (value && typeof value === 'object')
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [redact(key, secrets), redact(item, secrets)])
		);
	return value;
}

async function withClient<T>(
	connection: McpConnection,
	token: string,
	signal: AbortSignal,
	run: (client: Client, signal: AbortSignal) => Promise<T>
): Promise<T> {
	const deadline = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
	let cleanup = false;
	const client = new Client({ name: packageJson.name, version: packageJson.version });
	const transport = new StreamableHTTPClientTransport(new URL(connection.url), {
		requestInit: {
			headers:
				connection.auth === 'bearer' ? { Authorization: `Bearer ${token}` } : { 'x-api-key': token }
		},
		fetch: async (url, init) => {
			if (String(url) !== connection.url)
				throw new Error('MCP request escaped its configured endpoint');
			const response = await fetch(url, {
				...init,
				redirect: 'error',
				signal: cleanup
					? AbortSignal.timeout(2000)
					: AbortSignal.any([deadline, ...(init?.signal ? [init.signal] : [])])
			});
			if (!response.body) return response;
			let bytes = 0;
			const limited = response.body.pipeThrough(
				new TransformStream<Uint8Array, Uint8Array>({
					transform(chunk, controller) {
						bytes += chunk.byteLength;
						if (bytes > 2_097_152) throw new Error('MCP response too large');
						controller.enqueue(chunk);
					}
				})
			);
			return new Response(limited, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers
			});
		}
	});
	// Transport errors reach the request handler; never log remote payloads or credentials.
	client.onerror = () => {};
	try {
		await client.connect(transport, { signal: deadline, timeout: 15_000 });
		return await run(client, deadline);
	} finally {
		cleanup = true;
		if (transport.sessionId) {
			try {
				await transport.terminateSession();
			} catch {
				/* Closing locally remains required if remote cleanup fails. */
			}
		}
		await client.close();
	}
}

async function discover(client: Client, connection: McpConnection, signal: AbortSignal) {
	const tools = [];
	const cursors = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < 8; page++) {
		const result = await client.listTools(cursor ? { cursor } : {}, { signal, timeout: 15_000 });
		tools.push(...result.tools);
		if (tools.length > 128) throw new Error('MCP discovery limit exceeded');
		if (!result.nextCursor)
			return tools
				.filter((tool) => connection.tools.includes(tool.name))
				.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
		if (cursors.has(result.nextCursor)) throw new Error('MCP discovery cursor repeated');
		cursors.add(result.nextCursor);
		cursor = result.nextCursor;
	}
	throw new Error('MCP discovery incomplete');
}

export async function listRemoteTools(
	connection: McpConnection,
	token: string,
	signal: AbortSignal
) {
	return withClient(connection, token, signal, async (client, deadline) =>
		redact(await discover(client, connection, deadline), [token, connection.url])
	);
}

export async function executeRemoteTool(
	connection: McpConnection,
	token: string,
	tool: string,
	args: Record<string, unknown>,
	confirmed: boolean,
	signal: AbortSignal
) {
	if (!confirmed || !connection.tools.includes(tool))
		throw new Error('Tool is not approved for this call');
	if (JSON.stringify(args).length > 16000) throw new Error('Tool arguments exceed the limit');
	return withClient(connection, token, signal, async (client, deadline) => {
		const tools = await discover(client, connection, deadline);
		if (!tools.some((item) => item.name === tool))
			throw new Error('Tool is not currently advertised');
		const result = await client.callTool({ name: tool, arguments: args }, CallToolResultSchema, {
			signal: deadline,
			timeout: 15_000
		});
		if (result.isError) throw new Error('Remote tool failed');
		const output = redact(
			{ content: result.content, structuredContent: result.structuredContent },
			[token, connection.url]
		);
		if (JSON.stringify(output).length > 64000)
			throw new Error('Tool result exceeds the display limit');
		return output;
	});
}
