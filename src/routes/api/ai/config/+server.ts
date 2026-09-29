import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { requireCapabilityAccess } from '$lib/server/access';
import { aiSettings } from '$lib/server/ai/config';
import { mcpConnections } from '$lib/server/mcp/config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (env.AI_ENABLED === 'true' || env.MCP_CLIENT_ENABLED === 'true')
		await requireCapabilityAccess(event);
	try {
		return json(
			{
				ai: aiSettings(env),
				mcp: {
					enabled: env.MCP_CLIENT_ENABLED === 'true',
					servers: mcpConnections(env).map(({ alias }) => ({ alias }))
				}
			},
			{ headers: { 'Cache-Control': 'no-store' } }
		);
	} catch {
		error(503, 'Assistant setup is incomplete. Check the private server configuration.');
	}
};
