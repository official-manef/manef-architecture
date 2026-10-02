import type { ArchitectureGraph, DiagramMode, TraceMode } from '../types';
import { cloneGraph, parseGraphJson, validateGraph } from './graph';

export const DEFAULT_DIAGRAM_ORIGIN = 'https://diagram.manef.dev';
export const PORTABLE_GRAPH_MAX_CHARS = 6_000;

export type DiagramView = {
	graph?: ArchitectureGraph;
	query: string;
	tags: string[];
	seeds: string[];
	mode: DiagramMode;
	trace: TraceMode;
	focus: boolean;
};

export function tagGroup(tag: string): string {
	const separator = tag.indexOf(':');
	return separator > 0 ? tag.slice(0, separator) : 'general';
}

export function tagsMatchFacets(nodeTags: string[], selectedTags: string[]): boolean {
	if (selectedTags.length === 0) return true;
	const groups = new Map<string, string[]>();
	for (const tag of selectedTags) {
		const group = tagGroup(tag);
		groups.set(group, [...(groups.get(group) ?? []), tag]);
	}
	return [...groups.values()].every((tags) => tags.some((tag) => nodeTags.includes(tag)));
}

export function buildDiagramViewUrl(
	view: Partial<DiagramView> & { graph?: ArchitectureGraph },
	origin = DEFAULT_DIAGRAM_ORIGIN
): string {
	const url = new URL('/app', origin);
	if (view.query?.trim()) url.searchParams.set('q', view.query.trim());
	for (const tag of view.tags ?? []) url.searchParams.append('tag', tag);
	for (const seed of view.seeds ?? []) url.searchParams.append('seed', seed);
	if (view.mode) url.searchParams.set('mode', view.mode);
	if (view.trace) url.searchParams.set('trace', view.trace);
	if (view.focus) url.searchParams.set('focus', '1');
	if (view.graph) {
		if (!validateGraph(view.graph))
			throw new Error('Graph does not match the MANEF graph contract.');
		const payload = JSON.stringify(view.graph);
		if (payload.length > PORTABLE_GRAPH_MAX_CHARS) {
			throw new Error(
				`Portable graph is too large for a navigable URL (max ${PORTABLE_GRAPH_MAX_CHARS} characters).`
			);
		}
		url.searchParams.set('graph', payload);
	}
	return url.toString();
}

export function parseDiagramView(search: string): DiagramView {
	const params = new URLSearchParams(search);
	const graphPayload = params.get('graph');
	if (graphPayload && graphPayload.length > PORTABLE_GRAPH_MAX_CHARS) {
		throw new Error('Portable graph exceeds the shared-link size limit.');
	}
	const mode = params.get('mode');
	const trace = params.get('trace');
	return {
		graph: graphPayload ? cloneGraph(parseGraphJson(graphPayload)) : undefined,
		query: params.get('q') ?? '',
		tags: params.getAll('tag'),
		seeds: params.getAll('seed'),
		mode: mode === 'graph' ? 'graph' : 'flow',
		trace: trace === 'direct' ? 'direct' : 'component',
		focus: params.get('focus') === '1'
	};
}
