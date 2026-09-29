import type {
	ArchitectureEdge,
	ArchitectureGraph,
	ArchitectureNode,
	DiagramMode,
	Point,
	TraceMode,
	TraceResult
} from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPort(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		value.id.length > 0 &&
		typeof value.label === 'string'
	);
}

function connectionKey(edge: ArchitectureEdge): string {
	return `${edge.source}:${edge.sourcePort}>${edge.target}:${edge.targetPort}`;
}

export function validateGraph(value: unknown): value is ArchitectureGraph {
	if (
		!isRecord(value) ||
		value.schemaVersion !== 1 ||
		!Array.isArray(value.nodes) ||
		!Array.isArray(value.edges)
	) {
		return false;
	}

	const nodes = value.nodes as unknown[];
	const edges = value.edges as unknown[];
	const nodeIds = new Set<string>();
	const nodeMap = new Map<string, ArchitectureNode>();

	for (const raw of nodes) {
		if (
			!isRecord(raw) ||
			typeof raw.id !== 'string' ||
			raw.id.length === 0 ||
			nodeIds.has(raw.id) ||
			typeof raw.label !== 'string' ||
			!Array.isArray(raw.tags) ||
			!raw.tags.every((tag) => typeof tag === 'string') ||
			!Array.isArray(raw.inputs) ||
			!raw.inputs.every(isPort) ||
			!Array.isArray(raw.outputs) ||
			!raw.outputs.every(isPort)
		) {
			return false;
		}
		nodeIds.add(raw.id);
		nodeMap.set(raw.id, raw as ArchitectureNode);
	}

	const edgeIds = new Set<string>();
	const connections = new Set<string>();
	for (const raw of edges) {
		if (
			!isRecord(raw) ||
			typeof raw.id !== 'string' ||
			raw.id.length === 0 ||
			edgeIds.has(raw.id) ||
			typeof raw.source !== 'string' ||
			typeof raw.sourcePort !== 'string' ||
			typeof raw.target !== 'string' ||
			typeof raw.targetPort !== 'string'
		) {
			return false;
		}
		const edge = raw as ArchitectureEdge;
		const source = nodeMap.get(edge.source);
		const target = nodeMap.get(edge.target);
		if (
			!source?.outputs.some((port) => port.id === edge.sourcePort) ||
			!target?.inputs.some((port) => port.id === edge.targetPort)
		) {
			return false;
		}
		const key = connectionKey(edge);
		if (connections.has(key)) return false;
		edgeIds.add(edge.id);
		connections.add(key);
	}

	return true;
}

export function parseGraphJson(json: string): ArchitectureGraph {
	const value: unknown = JSON.parse(json);
	if (!validateGraph(value))
		throw new Error('JSON does not match the MANEF architecture graph contract.');
	return cloneGraph(value);
}

export function cloneGraph(graph: ArchitectureGraph): ArchitectureGraph {
	return {
		schemaVersion: 1,
		nodes: graph.nodes.map((node) => ({
			...node,
			tags: [...node.tags],
			inputs: node.inputs.map((port) => ({ ...port })),
			outputs: node.outputs.map((port) => ({ ...port }))
		})),
		edges: graph.edges.map((edge) => ({ ...edge, tags: edge.tags ? [...edge.tags] : undefined }))
	};
}

export function dedupeEdges(edges: ArchitectureEdge[]): ArchitectureEdge[] {
	const seen = new Set<string>();
	return edges.filter((edge) => {
		const key = connectionKey(edge);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function addEdge(graph: ArchitectureGraph, edge: ArchitectureEdge): ArchitectureGraph {
	if (graph.edges.some((current) => connectionKey(current) === connectionKey(edge))) return graph;
	const next = {
		...cloneGraph(graph),
		edges: [...graph.edges.map((item) => ({ ...item })), { ...edge }]
	};
	return validateGraph(next) ? next : graph;
}

export function adjacency(graph: ArchitectureGraph): Map<string, Set<string>> {
	const map = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
	for (const edge of graph.edges) {
		map.get(edge.source)?.add(edge.target);
		map.get(edge.target)?.add(edge.source);
	}
	return map;
}

export function traceGraph(
	graph: ArchitectureGraph,
	seeds: string[],
	mode: TraceMode = 'component'
): TraceResult {
	const validSeeds = seeds.filter((id) => graph.nodes.some((node) => node.id === id));
	if (validSeeds.length === 0) return { nodeIds: [], edgeIds: [] };

	const nodeIds = new Set(validSeeds);
	if (mode === 'direct') {
		for (const edge of graph.edges) {
			if (validSeeds.includes(edge.source) || validSeeds.includes(edge.target)) {
				nodeIds.add(edge.source);
				nodeIds.add(edge.target);
			}
		}
	} else {
		const neighbors = adjacency(graph);
		const queue = [...validSeeds];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const next of neighbors.get(current) ?? []) {
				if (!nodeIds.has(next)) {
					nodeIds.add(next);
					queue.push(next);
				}
			}
		}
	}

	const edgeIds = graph.edges
		.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
		.map((edge) => edge.id);
	return { nodeIds: [...nodeIds], edgeIds };
}

export function layoutGraph(graph: ArchitectureGraph, mode: DiagramMode): Record<string, Point> {
	if (mode === 'graph') {
		const count = Math.max(1, graph.nodes.length);
		return Object.fromEntries(
			graph.nodes.map((node, index) => {
				const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
				const radius = 360 + (index % 3) * 42;
				return [node.id, { x: 760 + Math.cos(angle) * radius, y: 610 + Math.sin(angle) * radius }];
			})
		);
	}

	const levels = new Map<number, ArchitectureNode[]>();
	for (const node of graph.nodes) {
		const level = node.level ?? 3;
		const list = levels.get(level) ?? [];
		list.push(node);
		levels.set(level, list);
	}
	const points: Record<string, Point> = {};
	for (const [level, nodes] of levels) {
		nodes.forEach((node, index) => {
			points[node.id] = { x: 80 + level * 320, y: 90 + index * 150 };
		});
	}
	return points;
}
