<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { SignalBanner } from '$lib/components/app-ui';
	import type {
		AiProvider,
		AssistantSettings,
		ChatEvent,
		ChatMessage,
		ToolListing
	} from '../contracts';

	let ready = $state(false);
	let settings = $state<AssistantSettings | null>(null);
	let loading = $state(false);
	let setupError = $state('');
	let accessToken = $state('');
	let provider = $state<AiProvider>('openai');
	let model = $state('');
	let apiKey = $state('');
	let prompt = $state('');
	let messages = $state<ChatMessage[]>([]);
	let chatBusy = $state(false);
	let chatError = $state('');
	let chatStatus = $state('');
	let alias = $state('');
	let mcpToken = $state('');
	let tools = $state<ToolListing[]>([]);
	let selectedTool = $state('');
	let argumentsText = $state('{}');
	let review = $state<{ alias: string; tool: string; arguments: Record<string, unknown> } | null>(
		null
	);
	let mcpBusy = $state(false);
	let mcpError = $state('');
	let toolOutput = $state('');
	let chatController: AbortController | undefined;
	let mcpController: AbortController | undefined;
	let setupController: AbortController | undefined;
	const availableModels = $derived(
		settings?.ai.providers.find((item) => item.id === provider)?.models ?? []
	);
	const currentTool = $derived(tools.find((tool) => tool.name === selectedTool));
	const busy = $derived(chatBusy || mcpBusy || loading);
	const inputClass =
		'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50';

	function headers() {
		return {
			'Content-Type': 'application/json',
			...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
		};
	}
	function failure(status: number) {
		if (status === 401)
			return 'Sign in or enter the application access token, then check setup again.';
		if (status === 403) return 'The application origin is not authorized. Check server setup.';
		if (status === 429) return 'Too many requests. Wait a minute before trying again.';
		if (status === 503) return 'Server setup is incomplete. Check the private configuration.';
		return 'The request failed. Check your inputs, credentials and configured limits.';
	}

	async function loadSettings() {
		loading = true;
		setupError = '';
		setupController?.abort();
		setupController = new AbortController();
		try {
			const response = await fetch('/api/ai/config', {
				headers: headers(),
				signal: setupController.signal
			});
			if (!response.ok) throw new Error(failure(response.status));
			settings = await response.json();
			provider = settings?.ai.providers[0]?.id ?? 'openai';
			model = settings?.ai.providers[0]?.models[0] ?? '';
			alias = settings?.mcp.servers[0]?.alias ?? '';
			tools = [];
			selectedTool = '';
			review = null;
		} catch (error) {
			if (!setupController.signal.aborted)
				setupError = error instanceof Error ? error.message : 'Could not load setup.';
		} finally {
			loading = false;
		}
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (chatBusy || !prompt.trim()) return;
		const conversation: ChatMessage[] = [...messages, { role: 'user', content: prompt }];
		if (
			conversation.length > 16 ||
			conversation.reduce((size, message) => size + message.content.length, 0) > 32000
		) {
			chatError = 'Conversation limit reached. Clear the conversation to start another.';
			return;
		}
		chatBusy = true;
		chatError = '';
		chatStatus = 'Waiting for the model';
		chatController = new AbortController();
		const index = conversation.length;
		messages = [...conversation, { role: 'assistant', content: '' }];
		prompt = '';
		try {
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({ provider, model, apiKey, messages: conversation }),
				signal: chatController.signal
			});
			if (!response.ok) throw new Error(failure(response.status));
			if (!response.body) throw new Error('The response stream is unavailable.');
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let complete = false;
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (chatController.signal.aborted) throw new Error('Generation stopped');
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						if (!line) continue;
						const part = JSON.parse(line) as ChatEvent;
						if (part.type === 'error')
							throw new Error(
								'Generation failed or exceeded its limits. Check model access and your key.'
							);
						if (part.type === 'text') {
							messages[index].content += part.text;
							chatStatus = 'Receiving response';
						}
						if (part.type === 'done') complete = true;
					}
				}
				if (!complete)
					throw new Error('The response ended early. Your partial response is retained.');
				chatStatus = 'Response complete';
			} finally {
				await reader.cancel();
				reader.releaseLock();
			}
		} catch (error) {
			chatError = chatController.signal.aborted
				? 'Generation stopped. Any partial response is retained.'
				: error instanceof Error
					? error.message
					: 'Generation failed.';
			chatStatus = '';
		} finally {
			chatController.abort();
			if (messages[index]?.content === '') messages = messages.filter((_, i) => i !== index);
			chatBusy = false;
		}
	}

	async function discover() {
		mcpBusy = true;
		mcpError = '';
		toolOutput = '';
		tools = [];
		selectedTool = '';
		review = null;
		mcpController = new AbortController();
		try {
			const response = await fetch('/api/mcp/tools', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({ action: 'list', alias, token: mcpToken }),
				signal: mcpController.signal
			});
			if (!response.ok) throw new Error(failure(response.status));
			const discovered: ToolListing[] = await response.json();
			if (mcpController.signal.aborted) throw new Error('Discovery stopped');
			tools = discovered;
			selectedTool = tools[0]?.name ?? '';
			if (!tools.length) mcpError = 'This server advertised no tools allowed by the application.';
		} catch (error) {
			mcpError = mcpController.signal.aborted
				? 'Discovery stopped.'
				: error instanceof Error
					? error.message
					: 'Discovery failed.';
		} finally {
			mcpController.abort();
			mcpBusy = false;
		}
	}

	function reviewCall() {
		mcpError = '';
		try {
			const args: unknown = JSON.parse(argumentsText);
			if (
				!args ||
				typeof args !== 'object' ||
				Array.isArray(args) ||
				argumentsText.length > 16000 ||
				!selectedTool
			)
				throw new Error();
			review = { alias, tool: selectedTool, arguments: args as Record<string, unknown> };
		} catch {
			mcpError = 'Select a tool and enter a JSON object of at most 16,000 characters.';
		}
	}

	async function execute() {
		if (!review || mcpBusy) return;
		const approved = review;
		review = null;
		mcpBusy = true;
		mcpError = '';
		toolOutput = '';
		mcpController = new AbortController();
		try {
			const response = await fetch('/api/mcp/tools', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({ action: 'execute', ...approved, token: mcpToken, confirmed: true }),
				signal: mcpController.signal
			});
			if (!response.ok)
				throw new Error(
					`${failure(response.status)} A submitted action may already have completed; inspect its state before retrying.`
				);
			const output: unknown = await response.json();
			if (mcpController.signal.aborted) throw new Error('Tool request stopped');
			toolOutput = JSON.stringify(output, null, 2);
		} catch (error) {
			mcpError = mcpController.signal.aborted
				? 'Request stopped. The remote action may still have completed; inspect its state before retrying.'
				: error instanceof Error
					? error.message
					: 'Tool call failed.';
		} finally {
			mcpController.abort();
			mcpBusy = false;
		}
	}

	function clear() {
		chatController?.abort();
		mcpController?.abort();
		setupController?.abort();
		apiKey = '';
		mcpToken = '';
		accessToken = '';
		messages = [];
		prompt = '';
		toolOutput = '';
		chatError = '';
		chatStatus = '';
		mcpError = '';
		setupError = '';
		review = null;
		tools = [];
		selectedTool = '';
	}
	onMount(() => {
		ready = true;
		loadSettings().catch(() => {
			setupError = 'Could not load setup.';
		});
		return () => {
			chatController?.abort();
			mcpController?.abort();
			setupController?.abort();
		};
	});
</script>

<div class="space-y-6">
	<SignalBanner title="Your keys, your session">
		Keys and conversation stay in this page's memory. Requests pass through this application server
		to the selected provider. Nothing is saved by this starter; your provider's own data policy
		still applies.
	</SignalBanner>
	<section aria-label="Assistant access" class="space-y-3 rounded-xl border p-4">
		<label for="assistant-access" class="text-sm font-medium"
			>Application access token <span class="font-normal text-muted-foreground"
				>(optional with an active sign-in)</span
			></label
		>
		<Input
			id="assistant-access"
			class="min-h-11"
			type="password"
			autocomplete="off"
			bind:value={accessToken}
			disabled={busy || !ready}
		/>
		<div class="flex flex-wrap gap-2">
			<Button class="min-h-11" variant="outline" onclick={loadSettings} disabled={busy || !ready}
				>{loading ? 'Checking setup…' : 'Check setup'}</Button
			><Button class="min-h-11" variant="ghost" onclick={clear} disabled={!ready}
				>Clear keys and conversation</Button
			>
		</div>
		{#if setupError}<p role="alert" class="text-sm text-destructive">{setupError}</p>{/if}
	</section>

	<section aria-labelledby="chat-heading" class="space-y-4">
		<h2 id="chat-heading" class="text-xl font-semibold">AI chat</h2>
		{#if !settings?.ai.enabled}
			<p class="text-sm text-muted-foreground">
				AI chat is disabled or setup has not been loaded. Enable <code>AI_ENABLED</code> and
				configure approved models on the server; see <code>docs/ai-mcp.md</code>.
			</p>
		{:else}
			<form onsubmit={send} class="space-y-3">
				<fieldset disabled={busy || !ready} class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1">
						<label for="chat-provider" class="text-sm font-medium">Provider</label><select
							id="chat-provider"
							class={inputClass}
							bind:value={provider}
							onchange={() => {
								apiKey = '';
								model =
									settings?.ai.providers.find((item) => item.id === provider)?.models[0] ?? '';
							}}
						>
							{#each settings.ai.providers as item (item.id)}<option value={item.id}
									>{item.label}</option
								>{/each}
						</select>
					</div>
					<div class="space-y-1">
						<label for="chat-model" class="text-sm font-medium">Approved model</label><select
							id="chat-model"
							class={inputClass}
							bind:value={model}
							>{#each availableModels as name (name)}<option value={name}>{name}</option
								>{/each}</select
						>
					</div>
					<div class="space-y-1 sm:col-span-2">
						<label for="chat-key" class="text-sm font-medium">Your provider API key</label><Input
							id="chat-key"
							class="min-h-11"
							type="password"
							autocomplete="off"
							bind:value={apiKey}
							required
						/>
					</div>
				</fieldset>
				{#if messages.length}<ol aria-label="Conversation" class="space-y-3">
						{#each messages as message, index (index)}<li class="rounded-lg border p-3">
								<p class="mb-1 text-xs font-semibold text-muted-foreground">
									{message.role === 'user' ? 'You' : 'Assistant'}
								</p>
								<p class="text-sm break-words whitespace-pre-wrap">
									{message.content || 'Waiting for response…'}
								</p>
							</li>{/each}
					</ol>{/if}
				<div class="space-y-1">
					<label for="chat-prompt" class="text-sm font-medium">Message</label><textarea
						id="chat-prompt"
						class={inputClass}
						rows="4"
						maxlength="8000"
						bind:value={prompt}
						disabled={busy || !ready}
						required></textarea>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button
						type="submit"
						class="min-h-11"
						disabled={busy || !ready || !apiKey || !model || !prompt.trim()}>Send message</Button
					>{#if chatBusy}<Button
							class="min-h-11"
							variant="outline"
							onclick={() => chatController?.abort()}>Stop generation</Button
						>{/if}
				</div>
				<p role="status" class="text-sm text-muted-foreground">{chatStatus}</p>
				{#if chatError}<p role="alert" class="text-sm text-destructive">{chatError}</p>{/if}
			</form>
		{/if}
	</section>

	<section aria-labelledby="mcp-heading" class="space-y-4 border-t pt-6">
		<h2 id="mcp-heading" class="text-xl font-semibold">Remote tools</h2>
		<p class="text-sm text-muted-foreground">
			Discover approved tools on demand. The model has no tool access. Review the exact arguments
			before each manual execution.
		</p>
		{#if !settings?.mcp.enabled}
			<p class="text-sm text-muted-foreground">
				Remote tools are disabled or setup has not been loaded. Configure <code
					>MCP_CLIENT_ENABLED</code
				>
				and approved servers; see <code>docs/ai-mcp.md</code>.
			</p>
		{:else}
			<fieldset disabled={busy || !ready || review !== null} class="space-y-3">
				<div class="space-y-1">
					<label for="mcp-alias" class="text-sm font-medium">Configured server</label><select
						id="mcp-alias"
						class={inputClass}
						bind:value={alias}
						onchange={() => {
							tools = [];
							selectedTool = '';
							toolOutput = '';
						}}
						>{#each settings.mcp.servers as server (server.alias)}<option value={server.alias}
								>{server.alias}</option
							>{/each}</select
					>
				</div>
				<div class="space-y-1">
					<label for="mcp-token" class="text-sm font-medium">Your server token or API key</label
					><Input
						id="mcp-token"
						class="min-h-11"
						type="password"
						autocomplete="off"
						bind:value={mcpToken}
					/>
				</div>
				<Button class="min-h-11" variant="outline" onclick={discover} disabled={!alias || !mcpToken}
					>Discover tools</Button
				>
				{#if tools.length}
					<div class="space-y-1">
						<label for="mcp-tool" class="text-sm font-medium">Allowed tool</label><select
							id="mcp-tool"
							class={inputClass}
							bind:value={selectedTool}
							>{#each tools as tool (tool.name)}<option value={tool.name}>{tool.name}</option
								>{/each}</select
						>
					</div>
					{#if currentTool}<details class="rounded-lg border p-3">
							<summary class="cursor-pointer text-sm font-medium"
								>Tool description and argument schema</summary
							>
							<p class="mt-2 text-sm break-words whitespace-pre-wrap">{currentTool.description}</p>
							<pre
								class="mt-2 max-h-64 overflow-auto text-xs break-all whitespace-pre-wrap">{JSON.stringify(
									currentTool.inputSchema,
									null,
									2
								)}</pre>
						</details>{/if}
					<div class="space-y-1">
						<label for="mcp-arguments" class="text-sm font-medium">Arguments (JSON object)</label
						><textarea
							id="mcp-arguments"
							class={inputClass}
							rows="5"
							maxlength="16000"
							bind:value={argumentsText}></textarea>
					</div>
					<Button class="min-h-11" onclick={reviewCall} disabled={!selectedTool}
						>Review tool call</Button
					>
				{/if}
			</fieldset>
			{#if review}<div
					class="space-y-3 rounded-xl border p-4"
					role="region"
					aria-label="Confirm tool call"
				>
					<h3 class="font-semibold">Confirm this tool call</h3>
					<p class="text-sm break-words">Server: {review.alias} · Tool: {review.tool}</p>
					<pre class="max-h-64 overflow-auto text-xs break-all whitespace-pre-wrap">{JSON.stringify(
							review.arguments,
							null,
							2
						)}</pre>
					<p class="text-sm text-muted-foreground">
						This calls the remote service and may change external data. Approval applies to this
						call only.
					</p>
					<div class="flex flex-wrap gap-2">
						<Button class="min-h-11" onclick={execute}>Confirm and execute once</Button><Button
							class="min-h-11"
							variant="outline"
							onclick={() => (review = null)}>Cancel review</Button
						>
					</div>
				</div>{/if}
			{#if mcpBusy}<div class="flex flex-wrap items-center gap-3">
					<p role="status" class="text-sm">Waiting for the remote server…</p>
					<Button class="min-h-11" variant="outline" onclick={() => mcpController?.abort()}
						>Stop request</Button
					>
				</div>{/if}
			{#if mcpError}<p role="alert" class="text-sm text-destructive">{mcpError}</p>{/if}
			{#if toolOutput}<div class="space-y-2">
					<h3 class="font-medium">Tool result</h3>
					<p class="text-xs text-muted-foreground">
						Remote output is untrusted data. Review it before using it in another action.
					</p>
					<pre
						class="max-h-96 overflow-auto rounded-lg border p-3 text-xs break-all whitespace-pre-wrap">{toolOutput}</pre>
				</div>{/if}
		{/if}
	</section>
</div>
