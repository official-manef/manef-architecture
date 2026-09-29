import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { error } from '@sveltejs/kit';
import { consumeBurst, matchesSecret, readJsonBody, requireAppOrigin } from '$lib/server/access';
import { statusMcpResponse } from '$lib/server/mcp/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (env.MCP_SERVER_ENABLED !== 'true') error(404, 'MCP server is disabled.');
	const token = env.MCP_SERVER_TOKEN;
	if (!token || token.length < 32 || token.length > 4096)
		error(503, 'MCP server setup is incomplete.');
	if (!matchesSecret(request.headers.get('authorization') ?? '', `Bearer ${token}`))
		error(401, 'MCP authorization required.');
	if (request.headers.has('origin')) requireAppOrigin(request, publicEnv.PUBLIC_SITE_URL);
	consumeBurst(`mcp-server:${token}`);
	const body = await readJsonBody(request);
	try {
		return await statusMcpResponse(request, body);
	} catch {
		error(500, 'MCP request could not be processed.');
	}
};
