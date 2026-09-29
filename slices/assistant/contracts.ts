export type AiProvider = 'openai' | 'anthropic' | 'google';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type AssistantSettings = {
	ai: { enabled: boolean; providers: { id: AiProvider; label: string; models: string[] }[] };
	mcp: { enabled: boolean; servers: { alias: string }[] };
};
export type ToolListing = {
	name: string;
	description?: string;
	inputSchema: Record<string, unknown>;
};
export type ChatEvent =
	{ type: 'text'; text: string } | { type: 'error'; message: string } | { type: 'done' };
