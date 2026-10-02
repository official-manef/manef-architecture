<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		addEdge,
		addInventoryItem,
		cloneGraph,
		defaultGraph,
		defaultInventory,
		layoutGraph,
		parseGraphJson,
		searchInventory,
		traceGraph,
		buildDiagramViewUrl,
		parseDiagramView,
		tagGroup,
		tagsMatchFacets
	} from './index';
	import type {
		ArchitectureEdge,
		ArchitectureGraph,
		ArchitectureNode,
		ArchitecturePort,
		DiagramMode,
		Point,
		TraceMode
	} from './types';

	let graph = $state<ArchitectureGraph>(cloneGraph(defaultGraph));
	let hydrated = $state(false);
	onMount(() => {
		try {
			const view = parseDiagramView(window.location.search);
			if (view.graph) graph = view.graph;
			search = view.query;
			activeTags = view.tags;
			diagramMode = view.mode;
			traceMode = view.trace;
			focusMode = view.focus;
			if (view.seeds[0] && graph.nodes.some((node) => node.id === view.seeds[0])) {
				selectedNodeId = view.seeds[0];
			}
		} catch {
			jsonMessage = 'This shared graph link is invalid or too large. The default graph is shown.';
		}
		jsonText = JSON.stringify(graph, null, 2);
		hydrated = true;
	});
	let diagramMode = $state<DiagramMode>('flow');
	let traceMode = $state<TraceMode>('component');
	let focusMode = $state(false);
	let search = $state('');
	let inventorySearch = $state('');
	let activeTags = $state<string[]>([]);
	let selectedNodeId = $state<string | null>('architecture');
	let selectedEdgeId = $state<string | null>(null);
	let armedOutput = $state<{ nodeId: string; portId: string } | null>(null);
	let jsonText = $state(JSON.stringify(defaultGraph, null, 2));
	let jsonMessage = $state('');
	let zoom = $state(0.72);
	let pan = $state({ x: 32, y: 28 });
	let overrides = $state<Record<string, Point>>({});
	let nodeDrag = $state<{
		nodeId: string;
		pointerId: number;
		offsetX: number;
		offsetY: number;
	} | null>(null);
	let panStart = $state<{
		pointerId: number;
		x: number;
		y: number;
		panX: number;
		panY: number;
	} | null>(null);
	let viewport = $state<HTMLDivElement | null>(null);

	const positions = $derived(layoutGraph(graph, diagramMode));
	const basePositions = $derived(
		Object.fromEntries(
			graph.nodes.map((node) => [
				node.id,
				overrides[node.id] ?? positions[node.id] ?? { x: 0, y: 0 }
			])
		)
	);
	const trace = $derived(
		selectedNodeId ? traceGraph(graph, [selectedNodeId], traceMode) : { nodeIds: [], edgeIds: [] }
	);
	const highlightedNodeIds = $derived(new Set(trace.nodeIds));
	const highlightedEdgeIds = $derived(new Set(trace.edgeIds));
	const selectedNode = $derived(graph.nodes.find((node) => node.id === selectedNodeId));
	const selectedEdge = $derived(graph.edges.find((edge) => edge.id === selectedEdgeId));
	const allTags = $derived([...new Set(graph.nodes.flatMap((node) => node.tags))].sort());
	const tagGroups = $derived(
		Object.entries(
			allTags.reduce<Record<string, string[]>>(
				(groups, tag) => {
					const group = tagGroup(tag);
					groups[group] = [...(groups[group] ?? []), tag];
					return groups;
				},
				Object.create(null) as Record<string, string[]>
			)
		).sort(([a], [b]) => a.localeCompare(b))
	);
	const inventoryItems = $derived(searchInventory(defaultInventory, inventorySearch));
	const worldStyle = $derived(`transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom});`);

	function nodeMatches(node: ArchitectureNode) {
		const needle = search.trim().toLowerCase();
		const searchMatch =
			!needle ||
			[node.label, node.subtitle ?? '', ...node.tags].join(' ').toLowerCase().includes(needle);
		const tagMatch = tagsMatchFacets(node.tags, activeTags);
		const focusMatch = !focusMode || !selectedNodeId || highlightedNodeIds.has(node.id);
		return searchMatch && tagMatch && focusMatch;
	}

	function selectNode(id: string) {
		selectedNodeId = id;
		selectedEdgeId = null;
	}

	function selectEdge(id: string) {
		selectedEdgeId = id;
		selectedNodeId = null;
	}

	function updateNode(id: string, patch: Partial<ArchitectureNode>) {
		graph = {
			...graph,
			nodes: graph.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node))
		};
	}

	function updatePort(
		nodeId: string,
		direction: 'inputs' | 'outputs',
		portId: string,
		patch: Partial<ArchitecturePort>
	) {
		const node = graph.nodes.find((item) => item.id === nodeId);
		if (!node) return;
		updateNode(nodeId, {
			[direction]: node[direction].map((port) =>
				port.id === portId ? { ...port, ...patch } : port
			)
		} as Partial<ArchitectureNode>);
	}

	function addPort(nodeId: string, direction: 'inputs' | 'outputs') {
		const node = graph.nodes.find((item) => item.id === nodeId);
		if (!node) return;
		const prefix = direction === 'inputs' ? 'in' : 'out';
		const index = node[direction].length + 1;
		updateNode(nodeId, {
			[direction]: [...node[direction], { id: `${prefix}-${index}`, label: `${prefix} ${index}` }]
		} as Partial<ArchitectureNode>);
	}

	function removePort(nodeId: string, direction: 'inputs' | 'outputs', portId: string) {
		const node = graph.nodes.find((item) => item.id === nodeId);
		if (!node) return;
		updateNode(nodeId, {
			[direction]: node[direction].filter((port) => port.id !== portId)
		} as Partial<ArchitectureNode>);
		graph = {
			...graph,
			edges: graph.edges.filter((edge) =>
				direction === 'inputs'
					? !(edge.target === nodeId && edge.targetPort === portId)
					: !(edge.source === nodeId && edge.sourcePort === portId)
			)
		};
	}

	function addNode() {
		const baseId = `node-${graph.nodes.length + 1}`;
		let id = baseId;
		let suffix = 1;
		while (graph.nodes.some((node) => node.id === id)) id = `${baseId}-${suffix++}`;
		const node: ArchitectureNode = {
			id,
			label: 'New node',
			subtitle: 'Describe this architecture item',
			tags: ['custom'],
			status: 'proposed',
			level: 3,
			inputs: [{ id: 'in', label: 'Input' }],
			outputs: [{ id: 'out', label: 'Output' }]
		};
		graph = { ...graph, nodes: [...graph.nodes, node] };
		selectNode(id);
	}

	function connectTo(targetNodeId: string, targetPortId: string) {
		if (!armedOutput) return;
		const edge: ArchitectureEdge = {
			id: `edge-${Date.now()}-${graph.edges.length}`,
			source: armedOutput.nodeId,
			sourcePort: armedOutput.portId,
			target: targetNodeId,
			targetPort: targetPortId,
			label: 'connects to',
			tags: ['custom']
		};
		graph = addEdge(graph, edge);
		jsonMessage = graph.edges.some((item) => item.id === edge.id)
			? 'Connection added. Output remains armed for another target.'
			: 'That connection already exists or is invalid.';
	}

	function disconnectEdge(id: string) {
		graph = { ...graph, edges: graph.edges.filter((edge) => edge.id !== id) };
		selectedEdgeId = null;
	}

	function materialize(id: string) {
		const item = defaultInventory.find((candidate) => candidate.id === id);
		if (!item) return;
		graph = addInventoryItem(graph, item);
		selectNode(item.id);
	}

	function exportJson() {
		jsonText = JSON.stringify(graph, null, 2);
		jsonMessage = 'Current graph exported to the editor.';
	}

	function importJson() {
		try {
			graph = parseGraphJson(jsonText);
			selectedNodeId = graph.nodes[0]?.id ?? null;
			selectedEdgeId = null;
			armedOutput = null;
			jsonMessage = 'JSON applied.';
		} catch (error) {
			jsonMessage = error instanceof Error ? error.message : 'Invalid graph JSON.';
		}
	}

	function toggleTag(tag: string) {
		activeTags = activeTags.includes(tag)
			? activeTags.filter((item) => item !== tag)
			: [...activeTags, tag];
	}

	async function shareView() {
		try {
			const url = buildDiagramViewUrl({
				graph,
				query: search,
				tags: activeTags,
				seeds: selectedNodeId ? [selectedNodeId] : [],
				mode: diagramMode,
				trace: traceMode,
				focus: focusMode
			});
			await navigator.clipboard.writeText(url);
			jsonMessage = 'Portable graph link copied.';
		} catch (error) {
			jsonMessage = error instanceof Error ? error.message : 'Could not create a portable link.';
		}
	}

	function edgePath(edge: ArchitectureEdge) {
		const source = basePositions[edge.source] ?? { x: 0, y: 0 };
		const target = basePositions[edge.target] ?? { x: 0, y: 0 };
		const x1 = source.x + 210;
		const y1 = source.y + 58;
		const x2 = target.x;
		const y2 = target.y + 58;
		if (diagramMode === 'graph') return `M ${x1} ${y1} L ${x2} ${y2}`;
		const bend = Math.max(70, Math.abs(x2 - x1) * 0.42);
		return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
	}

	function startNodeDrag(event: PointerEvent, nodeId: string) {
		const start = basePositions[nodeId] ?? { x: 0, y: 0 };
		nodeDrag = {
			nodeId,
			pointerId: event.pointerId,
			// grab offset in screen space: distance from pointer to node's rendered top-left
			offsetX: event.clientX - (pan.x + start.x * zoom),
			offsetY: event.clientY - (pan.y + start.y * zoom)
		};
		event.stopPropagation();
	}

	function moveNodeDrag(event: PointerEvent) {
		if (!nodeDrag || nodeDrag.pointerId !== event.pointerId) return;
		overrides = {
			...overrides,
			[nodeDrag.nodeId]: {
				x: (event.clientX - pan.x - nodeDrag.offsetX) / zoom,
				y: (event.clientY - pan.y - nodeDrag.offsetY) / zoom
			}
		};
	}

	function stopNodeDrag(event: PointerEvent) {
		if (nodeDrag?.pointerId === event.pointerId) nodeDrag = null;
	}

	function startPan(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('[data-interactive]')) return;
		viewport?.setPointerCapture(event.pointerId);
		panStart = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			panX: pan.x,
			panY: pan.y
		};
	}

	function movePan(event: PointerEvent) {
		if (!panStart || panStart.pointerId !== event.pointerId) return;
		pan = {
			x: panStart.panX + event.clientX - panStart.x,
			y: panStart.panY + event.clientY - panStart.y
		};
	}

	function stopPan(event: PointerEvent) {
		if (panStart?.pointerId === event.pointerId) panStart = null;
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		zoom = Math.min(1.4, Math.max(0.34, zoom * (event.deltaY < 0 ? 1.08 : 0.92)));
	}
</script>

<svelte:head>
	<title>MANEF Architecture</title>
	<meta
		name="description"
		content="Explore and edit a reusable graph of MANEF products, infrastructure and modular features."
	/>
</svelte:head>

<main class="workspace">
	<header class="topbar">
		<div class="identity">
			<div class="logo" aria-hidden="true">M</div>
			<div>
				<h1>MANEF Architecture</h1>
				<span>inventory + modular graph</span>
			</div>
		</div>
		<div class="segmented" aria-label="Diagram mode">
			<Button
				data-interactive
				variant={diagramMode === 'flow' ? 'default' : 'ghost'}
				aria-pressed={diagramMode === 'flow'}
				disabled={!hydrated}
				size="sm"
				onclick={() => (diagramMode = 'flow')}>Flow</Button
			>
			<Button
				data-interactive
				variant={diagramMode === 'graph' ? 'default' : 'ghost'}
				aria-pressed={diagramMode === 'graph'}
				disabled={!hydrated}
				size="sm"
				onclick={() => (diagramMode = 'graph')}>Graph</Button
			>
		</div>
		<div class="top-actions">
			<Button data-interactive variant="outline" size="sm" onclick={addNode}>+ Node</Button>
			<Button data-interactive variant="outline" size="sm" onclick={exportJson}>Export</Button>
			<Button data-interactive variant="outline" size="sm" onclick={shareView}>Share view</Button>
		</div>
	</header>

	<div class="shell">
		<aside class="sidebar">
			<section>
				<h2>Explore canvas</h2>
				<Input aria-label="Search graph" placeholder="Search graph…" bind:value={search} />
				<div class="tag-groups" aria-label="Tag group filters">
					{#each tagGroups as [group, tags] (group)}
						<div class="tag-group">
							<strong>{group}</strong>
							<div class="tags">
								{#each tags as tag (tag)}
									<Button
										size="sm"
										variant={activeTags.includes(tag) ? 'default' : 'outline'}
										onclick={() => toggleTag(tag)}
									>
										{tag.includes(':') ? tag.slice(tag.indexOf(':') + 1) : tag}
									</Button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section>
				<h2>Highlight</h2>
				<div class="segmented full">
					<Button
						size="sm"
						variant={traceMode === 'direct' ? 'default' : 'ghost'}
						aria-pressed={traceMode === 'direct'}
						onclick={() => (traceMode = 'direct')}>Direct</Button
					>
					<Button
						size="sm"
						variant={traceMode === 'component' ? 'default' : 'ghost'}
						aria-pressed={traceMode === 'component'}
						onclick={() => (traceMode = 'component')}>All connected</Button
					>
				</div>
				<Button
					class="full-button"
					variant={focusMode ? 'default' : 'outline'}
					aria-pressed={focusMode}
					size="sm"
					onclick={() => (focusMode = !focusMode)}>Focus: {focusMode ? 'On' : 'Off'}</Button
				>
			</section>

			<section>
				<h2>Inventory</h2>
				<div class="metric"><span>Graph nodes</span><strong>{graph.nodes.length}</strong></div>
				<div class="metric"><span>Connections</span><strong>{graph.edges.length}</strong></div>
				<div class="metric"><span>Portable core</span><strong>TypeScript</strong></div>
				<p class="help">
					Drag empty canvas space to pan. Wheel zooms. Select an output port, then one or more input
					ports to connect.
				</p>
			</section>
		</aside>

		<section class="canvas-shell">
			<div class="canvas-toolbar">
				{#if armedOutput}
					<span>Output armed: {armedOutput.nodeId} / {armedOutput.portId}</span>
					<Button size="sm" variant="outline" onclick={() => (armedOutput = null)}>Cancel</Button>
				{:else}
					<span>{diagramMode === 'flow' ? 'Flow' : 'Graph'} · {Math.round(zoom * 100)}%</span>
				{/if}
				<div>
					<Button size="sm" variant="outline" onclick={() => (zoom = Math.max(0.34, zoom * 0.9))}
						>−</Button
					>
					<Button size="sm" variant="outline" onclick={() => (zoom = Math.min(1.4, zoom * 1.1))}
						>+</Button
					>
				</div>
			</div>

			<div
				class="viewport"
				role="application"
				aria-label="MANEF architecture graph canvas"
				bind:this={viewport}
				onpointerdown={startPan}
				onpointermove={(event) => {
					moveNodeDrag(event);
					movePan(event);
				}}
				onpointerup={(event) => {
					stopNodeDrag(event);
					stopPan(event);
				}}
				onpointercancel={(event) => {
					stopNodeDrag(event);
					stopPan(event);
				}}
				onwheel={handleWheel}
			>
				<div class="world" style={worldStyle}>
					<svg class="edges" viewBox="0 0 2200 1400" aria-hidden="true">
						<defs>
							<marker
								id="arrow"
								viewBox="0 0 10 10"
								refX="9"
								refY="5"
								markerWidth="5"
								markerHeight="5"
								orient="auto-start-reverse"
							>
								<path d="M 0 0 L 10 5 L 0 10 z"></path>
							</marker>
						</defs>
						{#each graph.edges as edge (edge.id)}
							{#if nodeMatches(graph.nodes.find((node) => node.id === edge.source)!) && nodeMatches(graph.nodes.find((node) => node.id === edge.target)!)}
								<path
									d={edgePath(edge)}
									class:hot={highlightedEdgeIds.has(edge.id) || selectedEdgeId === edge.id}
									class:dim={!!selectedNodeId && !highlightedEdgeIds.has(edge.id)}
									marker-end="url(#arrow)"
								></path>
							{/if}
						{/each}
					</svg>

					{#each graph.nodes as node (node.id)}
						{#if nodeMatches(node)}
							<article
								class="node"
								class:hot={highlightedNodeIds.has(node.id)}
								class:selected={selectedNodeId === node.id}
								class:dim={!!selectedNodeId && !highlightedNodeIds.has(node.id)}
								style={`left: ${basePositions[node.id]?.x ?? 0}px; top: ${basePositions[node.id]?.y ?? 0}px;`}
								onpointerdown={(event) => {
									if (event.target instanceof Element && event.target.closest('[data-interactive]'))
										return;
									startNodeDrag(event, node.id);
								}}
							>
								<div class="node-head">
									<Button
										data-interactive
										class="node-select"
										variant="ghost"
										onclick={() => selectNode(node.id)}
									>
										<span>
											<strong>{node.label}</strong>
											<small>{node.subtitle}</small>
										</span>
									</Button>
									<span class="status" data-status={node.status ?? 'active'}
										>{node.status ?? 'active'}</span
									>
								</div>
								<div class="node-tags">{node.tags.join(' · ')}</div>
								<div class="ports inputs">
									{#each node.inputs as port (port.id)}
										<Button
											data-interactive
											size="sm"
											variant="outline"
											onclick={() => connectTo(node.id, port.id)}
										>
											<span class="socket"></span>{port.label}
										</Button>
									{/each}
								</div>
								<div class="ports outputs">
									{#each node.outputs as port (port.id)}
										<Button
											data-interactive
											size="sm"
											variant={armedOutput?.nodeId === node.id && armedOutput?.portId === port.id
												? 'default'
												: 'outline'}
											onclick={() => (armedOutput = { nodeId: node.id, portId: port.id })}
										>
											{port.label}<span class="socket"></span>
										</Button>
									{/each}
								</div>
							</article>
						{/if}
					{/each}
				</div>
			</div>

			<div class="edge-strip" aria-label="Connections">
				{#each graph.edges as edge (edge.id)}
					<Button
						size="sm"
						variant={selectedEdgeId === edge.id ? 'default' : 'outline'}
						onclick={() => selectEdge(edge.id)}
					>
						{graph.nodes.find((node) => node.id === edge.source)?.label} · {edge.label ??
							'connects'} ·
						{graph.nodes.find((node) => node.id === edge.target)?.label}
					</Button>
				{/each}
			</div>
		</section>

		<aside class="inspector">
			<section>
				<h2>Inventory</h2>
				<Input
					aria-label="Search inventory"
					placeholder="Search inventory…"
					bind:value={inventorySearch}
				/>
				<div class="inventory-list">
					{#each inventoryItems as item (item.id)}
						<div class="inventory-item">
							<div>
								<strong>{item.label}</strong>
								<small>{item.subtitle}</small>
							</div>
							<Button size="sm" variant="outline" onclick={() => materialize(item.id)}>
								{graph.nodes.some((node) => node.id === item.id) ? 'Open' : 'Add'}
							</Button>
						</div>
					{/each}
				</div>
			</section>

			{#if selectedNode}
				<section>
					<h2>Node details</h2>
					<label>
						<span>Label</span>
						<Input
							value={selectedNode.label}
							oninput={(event) => updateNode(selectedNode.id, { label: event.currentTarget.value })}
						/>
					</label>
					<label>
						<span>Subtitle</span>
						<Input
							value={selectedNode.subtitle ?? ''}
							oninput={(event) =>
								updateNode(selectedNode.id, { subtitle: event.currentTarget.value })}
						/>
					</label>
					<label>
						<span>Tags</span>
						<Input
							value={selectedNode.tags.join(', ')}
							onchange={(event) =>
								updateNode(selectedNode.id, {
									tags: event.currentTarget.value
										.split(',')
										.map((tag) => tag.trim())
										.filter(Boolean)
								})}
						/>
					</label>

					<div class="port-editor">
						<div>
							<div class="editor-heading">
								<strong>Inputs</strong>
								<Button
									size="sm"
									variant="outline"
									onclick={() => addPort(selectedNode.id, 'inputs')}>+</Button
								>
							</div>
							{#each selectedNode.inputs as port (port.id)}
								<div class="port-row">
									<Input
										value={port.label}
										oninput={(event) =>
											updatePort(selectedNode.id, 'inputs', port.id, {
												label: event.currentTarget.value
											})}
									/>
									<Button
										size="sm"
										variant="ghost"
										onclick={() => removePort(selectedNode.id, 'inputs', port.id)}>×</Button
									>
								</div>
							{/each}
						</div>
						<div>
							<div class="editor-heading">
								<strong>Outputs</strong>
								<Button
									size="sm"
									variant="outline"
									onclick={() => addPort(selectedNode.id, 'outputs')}>+</Button
								>
							</div>
							{#each selectedNode.outputs as port (port.id)}
								<div class="port-row">
									<Input
										value={port.label}
										oninput={(event) =>
											updatePort(selectedNode.id, 'outputs', port.id, {
												label: event.currentTarget.value
											})}
									/>
									<Button
										size="sm"
										variant="ghost"
										onclick={() => removePort(selectedNode.id, 'outputs', port.id)}>×</Button
									>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{:else if selectedEdge}
				<section>
					<h2>Connection details</h2>
					<label>
						<span>Label</span>
						<Input
							value={selectedEdge.label ?? ''}
							oninput={(event) =>
								(graph = {
									...graph,
									edges: graph.edges.map((edge) =>
										edge.id === selectedEdge.id
											? { ...edge, label: event.currentTarget.value }
											: edge
									)
								})}
						/>
					</label>
					<p class="help">
						{selectedEdge.source}:{selectedEdge.sourcePort} → {selectedEdge.target}:{selectedEdge.targetPort}
					</p>
					<Button variant="destructive" size="sm" onclick={() => disconnectEdge(selectedEdge.id)}>
						Disconnect
					</Button>
				</section>
			{:else}
				<section>
					<h2>Inspector</h2>
					<p class="help">Select a node or connection to edit its portable contract.</p>
				</section>
			{/if}

			<section>
				<h2>Graph JSON</h2>
				<textarea
					bind:value={jsonText}
					rows="11"
					spellcheck="false"
					aria-label="Architecture graph JSON"></textarea>
				<div class="json-actions">
					<Button size="sm" variant="outline" onclick={exportJson}>Refresh</Button>
					<Button size="sm" onclick={importJson}>Apply JSON</Button>
				</div>
				{#if jsonMessage}<p class="help" aria-live="polite">{jsonMessage}</p>{/if}
			</section>
		</aside>
	</div>
</main>

<style>
	.workspace {
		height: 100dvh;
		overflow: hidden;
		background: var(--background);
		color: var(--foreground);
	}
	.topbar {
		display: grid;
		grid-template-columns: minmax(13rem, 1fr) auto minmax(13rem, 1fr);
		align-items: center;
		gap: 0.75rem;
		height: 3.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--card);
		padding: 0 0.75rem;
	}
	.identity,
	.top-actions,
	.segmented,
	.canvas-toolbar,
	.edge-strip,
	.tags,
	.editor-heading,
	.port-row,
	.json-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.identity h1 {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.15;
	}
	.identity span,
	small,
	.help {
		color: var(--muted-foreground);
		font-size: 0.75rem;
	}
	.logo {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: var(--radius-md);
		background: var(--foreground);
		color: var(--background);
		font-weight: 800;
	}
	.top-actions {
		justify-content: flex-end;
	}
	.segmented {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--muted);
		padding: 0.2rem;
	}
	.segmented.full {
		width: 100%;
		margin-bottom: 0.6rem;
	}
	:global(.full-button) {
		width: 100%;
	}
	.shell {
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr) 20rem;
		height: calc(100dvh - 3.5rem);
		min-height: 0;
	}
	.sidebar,
	.inspector {
		min-height: 0;
		overflow-y: auto;
		background: var(--card);
	}
	.sidebar {
		border-right: 1px solid var(--border);
	}
	.inspector {
		border-left: 1px solid var(--border);
	}
	.sidebar section,
	.inspector section {
		display: grid;
		gap: 0.65rem;
		padding: 0.9rem;
		border-bottom: 1px solid var(--border);
	}
	h2 {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.tag-groups {
		display: grid;
		gap: 0.7rem;
	}
	.tag-group {
		display: grid;
		gap: 0.35rem;
	}
	.tag-group > strong {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.tags {
		flex-wrap: wrap;
	}
	.metric {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px dashed var(--border);
		padding: 0.4rem 0;
		font-size: 0.8rem;
	}
	.canvas-shell {
		position: relative;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		min-width: 0;
		min-height: 0;
		background: var(--muted);
	}
	.canvas-toolbar {
		justify-content: space-between;
		min-height: 2.75rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklab, var(--card) 94%, transparent);
		padding: 0.4rem 0.7rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.canvas-toolbar > div {
		display: flex;
		gap: 0.35rem;
	}
	.viewport {
		position: relative;
		min-height: 0;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		background-image: radial-gradient(circle, var(--border) 0.8px, transparent 0.8px);
		background-size: 22px 22px;
	}
	.viewport:active {
		cursor: grabbing;
	}
	.world {
		position: absolute;
		inset: 0 auto auto 0;
		width: 2200px;
		height: 1400px;
		transform-origin: 0 0;
	}
	.edges {
		position: absolute;
		inset: 0;
		width: 2200px;
		height: 1400px;
		overflow: visible;
	}
	.edges path:not([d^='M 0 0 L']) {
		fill: none;
		stroke: var(--muted-foreground);
		stroke-width: 1.6;
	}
	.edges path.hot {
		stroke: var(--foreground);
		stroke-width: 2.6;
	}
	.edges path.dim {
		opacity: 0.12;
	}
	.edges marker path {
		fill: var(--muted-foreground);
	}
	.node {
		position: absolute;
		width: 210px;
		min-height: 116px;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		box-shadow: 0 10px 28px color-mix(in oklab, var(--foreground) 8%, transparent);
		padding: 0.55rem;
		transition:
			opacity 120ms ease,
			border-color 120ms ease;
	}
	.node.hot,
	.node.selected {
		border-color: var(--ring);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 22%, transparent);
	}
	.node.dim {
		opacity: 0.18;
	}
	.node-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.4rem;
	}
	:global(.node-select) {
		height: auto;
		min-width: 0;
		flex: 1;
		justify-content: flex-start;
		padding: 0.2rem;
		text-align: left;
	}
	:global(.node-select) span {
		display: grid;
		min-width: 0;
		gap: 0.15rem;
	}
	:global(.node-select) strong,
	:global(.node-select) small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status {
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--muted);
		padding: 0.2rem 0.4rem;
		font-size: 0.62rem;
		color: var(--muted-foreground);
	}
	.status[data-status='private'] {
		color: var(--destructive);
	}
	.node-tags {
		margin: 0.35rem 0.2rem;
		overflow: hidden;
		color: var(--muted-foreground);
		font-size: 0.65rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ports {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.35rem;
	}
	.ports :global(button) {
		height: 1.75rem;
		padding: 0 0.45rem;
		font-size: 0.65rem;
	}
	.outputs {
		justify-content: flex-end;
	}
	.socket {
		width: 0.5rem;
		height: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--muted-foreground);
	}
	.edge-strip {
		overflow-x: auto;
		border-top: 1px solid var(--border);
		background: var(--card);
		padding: 0.45rem;
		scrollbar-width: thin;
	}
	.edge-strip :global(button) {
		flex: 0 0 auto;
	}
	.inventory-list,
	.port-editor {
		display: grid;
		gap: 0.55rem;
	}
	.inventory-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--muted);
		padding: 0.55rem;
	}
	.inventory-item div {
		display: grid;
		min-width: 0;
		gap: 0.15rem;
	}
	.inventory-item small {
		white-space: normal;
	}
	.port-editor {
		grid-template-columns: 1fr 1fr;
	}
	.editor-heading {
		justify-content: space-between;
		margin-bottom: 0.4rem;
		font-size: 0.75rem;
	}
	.port-row {
		margin-bottom: 0.35rem;
	}
	.port-row :global(input) {
		min-width: 0;
	}
	textarea {
		width: 100%;
		resize: vertical;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--muted);
		color: var(--foreground);
		padding: 0.65rem;
		font:
			0.7rem/1.45 ui-monospace,
			SFMono-Regular,
			Menlo,
			monospace;
	}
	.json-actions {
		justify-content: flex-end;
	}

	@media (max-width: 68rem) {
		.shell {
			grid-template-columns: 13rem minmax(0, 1fr);
		}
		.inspector {
			position: absolute;
			right: 0.75rem;
			bottom: 0.75rem;
			z-index: 10;
			width: min(22rem, calc(100vw - 15rem));
			max-height: 58%;
			border: 1px solid var(--border);
			border-radius: var(--radius-lg);
			box-shadow: 0 16px 40px color-mix(in oklab, var(--foreground) 14%, transparent);
		}
	}

	@media (max-width: 44rem) {
		.workspace {
			height: auto;
			min-height: 100dvh;
			overflow: visible;
		}
		.topbar {
			grid-template-columns: 1fr auto;
			height: auto;
			min-height: 4rem;
			padding: 0.55rem;
		}
		.segmented {
			order: 3;
			grid-column: 1 / -1;
			justify-content: stretch;
		}
		.segmented :global(button) {
			flex: 1;
		}
		.top-actions {
			align-self: flex-start;
		}
		.shell {
			display: flex;
			height: auto;
			flex-direction: column;
		}
		.sidebar,
		.inspector {
			position: static;
			width: auto;
			max-height: none;
			overflow: visible;
			border: 0;
			border-bottom: 1px solid var(--border);
			border-radius: 0;
			box-shadow: none;
		}
		.canvas-shell {
			height: 66dvh;
			min-height: 34rem;
			order: -1;
		}
		.sidebar {
			display: grid;
			grid-template-columns: 1fr;
		}
		.port-editor {
			grid-template-columns: 1fr;
		}
	}
</style>
