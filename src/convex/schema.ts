import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const port = v.object({
	id: v.string(),
	label: v.string(),
	kind: v.optional(v.string())
});

const architectureNode = v.object({
	id: v.string(),
	label: v.string(),
	subtitle: v.optional(v.string()),
	tags: v.array(v.string()),
	group: v.optional(v.string()),
	status: v.optional(v.union(v.literal('active'), v.literal('proposed'), v.literal('private'))),
	level: v.optional(v.number()),
	inputs: v.array(port),
	outputs: v.array(port)
});

const architectureEdge = v.object({
	id: v.string(),
	source: v.string(),
	sourcePort: v.string(),
	target: v.string(),
	targetPort: v.string(),
	label: v.optional(v.string()),
	tags: v.optional(v.array(v.string()))
});

export const architectureGraph = v.object({
	schemaVersion: v.literal(1),
	nodes: v.array(architectureNode),
	edges: v.array(architectureEdge)
});

export default defineSchema({
	notes: defineTable({
		owner: v.string(),
		body: v.string(),
		updatedAt: v.number()
	}).index('by_owner', ['owner']),
	architectureSnapshots: defineTable({
		owner: v.string(),
		name: v.string(),
		graph: architectureGraph,
		updatedAt: v.number()
	}).index('by_owner_and_updatedAt', ['owner', 'updatedAt'])
});
