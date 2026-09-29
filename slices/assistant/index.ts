export type {
	AiProvider,
	ChatMessage,
	AssistantSettings,
	ToolListing,
	ChatEvent
} from './contracts';
export const assistantFeature = {
	slug: 'assistant',
	label: 'Assistant',
	description: 'Bring your own AI key and review each remote tool call before execution.',
	icon: 'assistant',
	loadScreen: async () => (await import('./components/assistant-screen.svelte')).default
} as const;
