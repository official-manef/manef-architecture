import { describe, expect, test } from 'vitest';
import {
	buildDiagramViewUrl,
	parseDiagramView,
	tagsMatchFacets,
	PORTABLE_GRAPH_MAX_CHARS
} from './share';
import { defaultGraph } from '../config/default-graph';

describe('portable context graph views', () => {
	test('round-trips a bounded graph and view filters', () => {
		const url = buildDiagramViewUrl({
			graph: defaultGraph,
			query: 'mso',
			tags: ['project:mso', 'kind:product'],
			seeds: ['mso'],
			mode: 'graph',
			trace: 'direct',
			focus: true
		});
		const parsed = parseDiagramView(new URL(url).search);
		expect(parsed.graph?.nodes.length).toBe(defaultGraph.nodes.length);
		expect(parsed.tags).toEqual(['project:mso', 'kind:product']);
		expect(parsed.seeds).toEqual(['mso']);
		expect(parsed.mode).toBe('graph');
		expect(parsed.trace).toBe('direct');
		expect(parsed.focus).toBe(true);
	});

	test('ORs tags inside one facet and ANDs across facets', () => {
		const tags = ['project:mso', 'platform:vercel', 'agent:lara'];
		expect(tagsMatchFacets(tags, ['project:mso', 'agent:lara'])).toBe(true);
		expect(tagsMatchFacets(tags, ['agent:lara', 'agent:manef'])).toBe(true);
		expect(tagsMatchFacets(tags, ['project:mso', 'platform:convex'])).toBe(false);
	});

	test('rejects malformed and oversized incoming graph payloads', () => {
		expect(() => parseDiagramView('?graph=not-json')).toThrow();
		expect(() => parseDiagramView('?graph=%7B%7D')).toThrow();
		const graph = { schemaVersion: 1, nodes: [], edges: [] };
		const payload = JSON.stringify(graph).padEnd(PORTABLE_GRAPH_MAX_CHARS + 1, ' ');
		expect(() => parseDiagramView(`?graph=${encodeURIComponent(payload)}`)).toThrow(/size limit/);
	});
});
