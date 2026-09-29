import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { architectureGraph } from './schema';

const snapshotSummary = v.object({
	_id: v.id('architectureSnapshots'),
	_creationTime: v.number(),
	name: v.string(),
	updatedAt: v.number()
});

const snapshot = v.object({
	_id: v.id('architectureSnapshots'),
	_creationTime: v.number(),
	name: v.string(),
	graph: architectureGraph,
	updatedAt: v.number()
});

const MAX_SNAPSHOTS = 40;
const MAX_NODES = 250;
const MAX_EDGES = 1000;
const MAX_LABEL = 160;
const MAX_TEXT = 1000;

async function owner(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity)
		throw new ConvexError({
			code: 'NOT_AUTHORIZED',
			message: 'Sign in to save architecture snapshots.'
		});
	return identity.tokenIdentifier;
}

function boundedText(value: string, label: string, max = MAX_TEXT) {
	const text = value.trim();
	if (!text || text.length > max) {
		throw new ConvexError({
			code: 'INVALID_INPUT',
			message: `${label} must contain between 1 and ${max} characters.`
		});
	}
	return text;
}

function validateGraphLimits(graph: typeof architectureGraph.type) {
	if (graph.nodes.length > MAX_NODES || graph.edges.length > MAX_EDGES) {
		throw new ConvexError({
			code: 'GRAPH_TOO_LARGE',
			message: `A snapshot supports up to ${MAX_NODES} nodes and ${MAX_EDGES} edges.`
		});
	}
	const ids = new Set<string>();
	for (const node of graph.nodes) {
		if (ids.has(node.id)) {
			throw new ConvexError({ code: 'INVALID_GRAPH', message: 'Node ids must be unique.' });
		}
		ids.add(node.id);
		boundedText(node.id, 'Node id', MAX_LABEL);
		boundedText(node.label, 'Node label', MAX_LABEL);
		if (node.subtitle) boundedText(node.subtitle, 'Node subtitle');
	}
	const connections = new Set<string>();
	for (const edge of graph.edges) {
		if (!ids.has(edge.source) || !ids.has(edge.target)) {
			throw new ConvexError({
				code: 'INVALID_GRAPH',
				message: 'Every edge endpoint must reference an existing node.'
			});
		}
		const key = `${edge.source}:${edge.sourcePort}>${edge.target}:${edge.targetPort}`;
		if (connections.has(key)) {
			throw new ConvexError({
				code: 'INVALID_GRAPH',
				message: 'Duplicate endpoint connections are not allowed.'
			});
		}
		connections.add(key);
	}
}

export const list = query({
	args: { limit: v.optional(v.number()) },
	returns: v.array(snapshotSummary),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 20), MAX_SNAPSHOTS));
		const rows = await ctx.db
			.query('architectureSnapshots')
			.withIndex('by_owner_and_updatedAt', (q) => q.eq('owner', identity))
			.order('desc')
			.take(limit);
		return rows.map(({ _id, _creationTime, name, updatedAt }) => ({
			_id,
			_creationTime,
			name,
			updatedAt
		}));
	}
});

export const get = query({
	args: { id: v.id('architectureSnapshots') },
	returns: v.union(snapshot, v.null()),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const row = await ctx.db.get('architectureSnapshots', args.id);
		if (!row || row.owner !== identity) return null;
		const { _id, _creationTime, name, graph, updatedAt } = row;
		return { _id, _creationTime, name, graph, updatedAt };
	}
});

export const save = mutation({
	args: {
		id: v.optional(v.id('architectureSnapshots')),
		name: v.string(),
		graph: architectureGraph
	},
	returns: v.id('architectureSnapshots'),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const name = boundedText(args.name, 'Snapshot name', MAX_LABEL);
		validateGraphLimits(args.graph);
		const updatedAt = Date.now();

		if (args.id) {
			const existing = await ctx.db.get('architectureSnapshots', args.id);
			if (!existing || existing.owner !== identity) {
				throw new ConvexError({ code: 'NOT_FOUND', message: 'Snapshot not found.' });
			}
			await ctx.db.patch('architectureSnapshots', args.id, { name, graph: args.graph, updatedAt });
			return args.id;
		}

		const existing = await ctx.db
			.query('architectureSnapshots')
			.withIndex('by_owner_and_updatedAt', (q) => q.eq('owner', identity))
			.take(MAX_SNAPSHOTS);
		if (existing.length >= MAX_SNAPSHOTS) {
			throw new ConvexError({
				code: 'LIMIT_REACHED',
				message: `An account can keep up to ${MAX_SNAPSHOTS} architecture snapshots.`
			});
		}
		return await ctx.db.insert('architectureSnapshots', {
			owner: identity,
			name,
			graph: args.graph,
			updatedAt
		});
	}
});

export const remove = mutation({
	args: { id: v.id('architectureSnapshots') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await owner(ctx);
		const existing = await ctx.db.get('architectureSnapshots', args.id);
		if (!existing || existing.owner !== identity) {
			throw new ConvexError({ code: 'NOT_FOUND', message: 'Snapshot not found.' });
		}
		await ctx.db.delete('architectureSnapshots', args.id);
		return null;
	}
});
