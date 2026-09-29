import { describe, expect, it } from 'vitest';
import { defaultGraph } from '../config/default-graph';
import { addEdge, cloneGraph, traceGraph, validateGraph } from './graph';
import { addInventoryItem } from './inventory';

describe('architecture graph core', () => {
	it('validates the bundled graph', () => {
		expect(validateGraph(defaultGraph)).toBe(true);
	});

	it('traces direct neighbors and the whole connected component', () => {
		const direct = traceGraph(defaultGraph, ['manef-dev'], 'direct');
		expect(direct.nodeIds).toContain('manef');
		expect(direct.nodeIds).toContain('architecture');

		const component = traceGraph(defaultGraph, ['architecture'], 'component');
		expect(component.nodeIds).toContain('manef');
		expect(component.nodeIds).toContain('ops');
	});

	it('does not add duplicate endpoint connections', () => {
		const graph = cloneGraph(defaultGraph);
		const duplicate = { ...graph.edges[0], id: 'another-id' };
		expect(addEdge(graph, duplicate).edges).toHaveLength(graph.edges.length);
	});

	it('materializes inventory once', () => {
		const item = { id: 'sample', label: 'Sample', tags: ['sample'] };
		const once = addInventoryItem(defaultGraph, item);
		const twice = addInventoryItem(once, item);
		expect(once.nodes.some((node) => node.id === 'sample')).toBe(true);
		expect(twice.nodes).toHaveLength(once.nodes.length);
	});
});
