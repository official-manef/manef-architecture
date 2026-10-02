import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import packageJson from '../../../../package.json';
import {
	adjacency,
	defaultGraph,
	defaultInventory,
	layoutGraph,
	searchInventory,
	traceGraph,
	validateGraph,
	buildDiagramViewUrl,
	tagsMatchFacets
} from '../../../../slices/architecture-inventory/index';

function graphSnapshot() {
	if (!validateGraph(defaultGraph)) throw new Error('Bundled architecture graph is invalid.');
	return {
		schemaVersion: defaultGraph.schemaVersion,
		nodes: defaultGraph.nodes,
		edges: defaultGraph.edges
	};
}

export async function statusMcpResponse(request: Request, parsedBody: unknown) {
	const server = new McpServer({ name: packageJson.name, version: packageJson.version });

	server.registerTool(
		'graph_status',
		{
			description:
				'Read the MANEF architecture graph identity and its current node/edge counts. Read-only.',
			inputSchema: z.object({}).strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => {
			const graph = graphSnapshot();
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							name: packageJson.name,
							version: packageJson.version,
							schemaVersion: graph.schemaVersion,
							nodeCount: graph.nodes.length,
							edgeCount: graph.edges.length
						})
					}
				]
			};
		}
	);

	server.registerTool(
		'graph_list_nodes',
		{
			description:
				'List all nodes in the MANEF public architecture graph, optionally filtered by tag or status. Read-only.',
			inputSchema: z
				.object({
					tag: z.string().optional(),
					status: z.enum(['active', 'proposed', 'private']).optional()
				})
				.strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ tag, status }) => {
			const nodes = defaultGraph.nodes.filter(
				(node) =>
					(!tag || node.tags.includes(tag)) && (!status || (node.status ?? 'active') === status)
			);
			return { content: [{ type: 'text', text: JSON.stringify(nodes) }] };
		}
	);

	server.registerTool(
		'graph_list_edges',
		{
			description: 'List all connections (edges) in the MANEF architecture graph. Read-only.',
			inputSchema: z.object({}).strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => ({ content: [{ type: 'text', text: JSON.stringify(defaultGraph.edges) }] })
	);

	server.registerTool(
		'graph_trace',
		{
			description:
				'Trace the graph from one or more seed node ids, returning the connected nodes and edges. mode "direct" returns immediate neighbors; "component" returns the whole connected component. Read-only.',
			inputSchema: z
				.object({
					seeds: z.array(z.string()).min(1).max(50),
					mode: z.enum(['direct', 'component']).default('component')
				})
				.strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ seeds, mode }) => ({
			content: [{ type: 'text', text: JSON.stringify(traceGraph(defaultGraph, seeds, mode)) }]
		})
	);

	server.registerTool(
		'graph_layout',
		{
			description:
				'Compute node positions for the MANEF architecture graph in "flow" or "graph" layout mode. Read-only.',
			inputSchema: z.object({ mode: z.enum(['flow', 'graph']).default('flow') }).strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ mode }) => ({
			content: [{ type: 'text', text: JSON.stringify(layoutGraph(defaultGraph, mode)) }]
		})
	);

	server.registerTool(
		'graph_search_inventory',
		{
			description:
				'Search the MANEF architecture inventory for items that can be materialized into the graph. Read-only.',
			inputSchema: z.object({ query: z.string().default('') }).strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ query }) => ({
			content: [{ type: 'text', text: JSON.stringify(searchInventory(defaultInventory, query)) }]
		})
	);

	server.registerTool(
		'graph_adjacency',
		{
			description: 'Return the adjacency map of the MANEF architecture graph. Read-only.',
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
					text: JSON.stringify(
						Object.fromEntries([...adjacency(defaultGraph)].map(([id, set]) => [id, [...set]]))
					)
				}
			]
		})
	);

	server.registerTool(
		'graph_query',
		{
			description:
				'Query the MANEF context graph by free text, namespaced facets and status. Tags in one namespace are OR-ed; namespaces are AND-ed. Returns the matching bounded subgraph and a navigable view URL. Read-only.',
			inputSchema: z
				.object({
					query: z.string().max(200).default(''),
					tags: z.array(z.string().max(100)).max(30).default([]),
					status: z.enum(['active', 'proposed', 'private']).optional()
				})
				.strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ query, tags, status }) => {
			const needle = query.trim().toLowerCase();
			const nodes = defaultGraph.nodes.filter((node) => {
				const textMatch =
					!needle ||
					[node.label, node.subtitle ?? '', ...node.tags].join(' ').toLowerCase().includes(needle);
				return (
					textMatch &&
					tagsMatchFacets(node.tags, tags) &&
					(!status || (node.status ?? 'active') === status)
				);
			});
			const nodeIds = new Set(nodes.map((node) => node.id));
			const edges = defaultGraph.edges.filter(
				(edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
			);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							nodes,
							edges,
							viewUrl: buildDiagramViewUrl({
								graph: { schemaVersion: 1, nodes, edges },
								seeds: [],
								mode: 'graph',
								trace: 'component',
								focus: false
							})
						})
					}
				]
			};
		}
	);

	server.registerTool(
		'graph_build_view',
		{
			description:
				'Build a navigable diagram.manef.dev URL for the bundled context graph with search, facet, seed, layout, trace and focus state. Read-only.',
			inputSchema: z
				.object({
					query: z.string().max(200).default(''),
					tags: z.array(z.string().max(100)).max(30).default([]),
					seeds: z.array(z.string().max(200)).max(30).default([]),
					mode: z.enum(['flow', 'graph']).default('graph'),
					trace: z.enum(['direct', 'component']).default('component'),
					focus: z.boolean().default(false)
				})
				.strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ query, tags, seeds, mode, trace, focus }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						url: buildDiagramViewUrl({ query, tags, seeds, mode, trace, focus })
					})
				}
			]
		})
	);

	server.registerTool(
		'graph_create_portable_view',
		{
			description:
				'Validate a bounded MANEF graph supplied by any agent/client and return a stateless navigable diagram.manef.dev URL. This does not persist or mutate server data.',
			inputSchema: z
				.object({
					graph: z.unknown(),
					query: z.string().max(200).default(''),
					tags: z.array(z.string().max(100)).max(30).default([]),
					seeds: z.array(z.string().max(200)).max(30).default([]),
					mode: z.enum(['flow', 'graph']).default('graph'),
					trace: z.enum(['direct', 'component']).default('component'),
					focus: z.boolean().default(false)
				})
				.strict(),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ graph, query, tags, seeds, mode, trace, focus }) => {
			if (!validateGraph(graph)) throw new Error('Graph does not match the MANEF graph contract.');
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							url: buildDiagramViewUrl({ graph, query, tags, seeds, mode, trace, focus }),
							nodeCount: graph.nodes.length,
							edgeCount: graph.edges.length,
							persisted: false
						})
					}
				]
			};
		}
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
