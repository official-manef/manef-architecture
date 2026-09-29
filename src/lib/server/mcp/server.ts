import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import packageJson from '../../../../package.json';

export async function statusMcpResponse(request: Request, parsedBody: unknown) {
	const server = new McpServer({ name: packageJson.name, version: packageJson.version });
	server.registerTool(
		'starter_status',
		{
			description: 'Read template identity and version only; no application data or secrets.',
			inputSchema: z.object({}).strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						name: packageJson.name,
						version: packageJson.version,
						backend: 'convex'
					})
				}
			]
		})
	);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true
	});
	try {
		await server.connect(transport);
		const response = await transport.handleRequest(request, { parsedBody });
		const bytes = response.body ? await response.arrayBuffer() : null;
		const headers = new Headers(response.headers);
		headers.set('Cache-Control', 'no-store');
		return new Response(bytes, { status: response.status, headers });
	} finally {
		await server.close();
	}
}
