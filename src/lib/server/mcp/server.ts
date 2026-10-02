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
	validateGraph
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
