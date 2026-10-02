import type { ArchitectureGraph, ArchitectureNode, InventoryItem } from '../types';

const ports = () => ({
	inputs: [{ id: 'in', label: 'Consumes' }],
	outputs: [{ id: 'out', label: 'Provides' }]
});

function node(
	id: string,
	label: string,
	subtitle: string,
	level: number,
	status: ArchitectureNode['status'] = 'active',
	tags: string[] = ['manef']
): ArchitectureNode {
	return { id, label, subtitle, level, status, tags, ...ports() };
}

export const defaultGraph: ArchitectureGraph = {
	schemaVersion: 1,
	nodes: [
		node('manef', 'MANEF', 'Product studio and technology ecosystem', 0, 'active', [
			'manef',
			'brand'
		]),
		node('manef-dev', 'manef.dev', 'Canonical MANEF product domain', 1, 'active', [
			'manef',
			'domain'
		]),
		node(
			'architecture',
			'diagram.manef.dev',
			'Interactive architecture + agent context graph',
			2,
			'active',
			['manef', 'architecture', 'product', 'project:manef-diagram', 'platform:vercel', 'kind:context-graph']
		),
		node('mso', 'mso.manef.dev', 'Manef Shell OS', 2, 'active', ['manef', 'product', 'ai', 'project:mso', 'kind:product']),
		node('models', 'models.manef.dev', 'Model catalog and routing', 2, 'proposed', [
			'manef',
			'product',
			'ai'
		]),
		node('connectors', 'connectors.manef.dev', 'Integration and connector gateway', 2, 'proposed', [
			'manef',
			'infra'
		]),
		node(
			'registry',
			'registry.manef.dev',
			'Apps, agents, tools and feature registry',
			2,
			'proposed',
			['manef', 'product']
		),
		node('docs', 'docs.manef.dev', 'Shared product documentation', 2, 'proposed', [
			'manef',
			'docs'
		]),
		node('ops', 'ops.manef.dev', 'Private operator surface', 2, 'private', [
			'manef',
			'infra',
			'private'
		])
	],
	edges: [
		{
			id: 'brand-domain',
			source: 'manef',
			sourcePort: 'out',
			target: 'manef-dev',
			targetPort: 'in',
			label: 'canonical domain'
		},
		{
			id: 'domain-architecture',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'architecture',
			targetPort: 'in',
			label: 'product'
		},
		{
			id: 'domain-mso',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'mso',
			targetPort: 'in',
			label: 'product'
		},
		{
			id: 'domain-models',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'models',
			targetPort: 'in',
			label: 'product'
		},
		{
			id: 'domain-connectors',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'connectors',
			targetPort: 'in',
			label: 'infrastructure'
		},
		{
			id: 'domain-registry',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'registry',
			targetPort: 'in',
			label: 'registry'
		},
		{
			id: 'domain-docs',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'docs',
			targetPort: 'in',
			label: 'documentation'
		},
		{
			id: 'domain-ops',
			source: 'manef-dev',
			sourcePort: 'out',
			target: 'ops',
			targetPort: 'in',
			label: 'private operations'
		}
	]
};

export const defaultInventory: InventoryItem[] = [
	{
		id: 'open-silong',
		label: 'Open Silong',
		subtitle: 'Knowledge graph patterns reused as a framework-neutral reference',
		tags: ['reference', 'graph', 'knowledge', 'kind:reference', 'source:github'],
		status: 'active'
	},
	{
		id: 'convex-cloud',
		label: 'Convex Cloud',
		subtitle: 'Optional managed realtime persistence adapter',
		tags: ['backend', 'convex', 'cloud', 'platform:convex', 'kind:backend'],
		status: 'active'
	},
	{
		id: 'dokploy',
		label: 'Dokploy',
		subtitle: 'Production Node/container deployment target',
		tags: ['deploy', 'infra', 'platform:dokploy', 'kind:deployment'],
		status: 'active'
	}
];
