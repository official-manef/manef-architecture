import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { requireCapabilityAccess, readJsonBody } from '$lib/server/access';
import { parseChat } from '$lib/server/ai/config';
import { chatResponse } from '$lib/server/ai/chat';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (env.AI_ENABLED !== 'true') error(404, 'AI chat is disabled.');
	await requireCapabilityAccess(event);
	const body = await readJsonBody(event.request);
	let input: ReturnType<typeof parseChat>;
	try {
		input = parseChat(env, body);
	} catch {
		error(400, 'Check the approved provider/model, key and conversation limits.');
	}
	return chatResponse(input, event.request.signal);
};
