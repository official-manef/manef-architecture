import type { ArchitectureGraph, ArchitectureNode, InventoryItem } from '../types';

export function searchInventory(
	items: InventoryItem[],
	query: string,
	activeTags: string[] = []
): InventoryItem[] {
	const needle = query.trim().toLowerCase();
	return items.filter((item) => {
		const text = [item.id, item.label, item.subtitle ?? '', ...item.tags].join(' ').toLowerCase();
		return (!needle || text.includes(needle)) && activeTags.every((tag) => item.tags.includes(tag));
	});
}

export function materializeInventoryItem(item: InventoryItem): ArchitectureNode {
	return {
		id: item.id,
		label: item.label,
		subtitle: item.subtitle,
		tags: [...item.tags],
		group: item.group,
		status: item.status,
		inputs: item.inputs?.map((port) => ({ ...port })) ?? [{ id: 'in', label: 'Input' }],
		outputs: item.outputs?.map((port) => ({ ...port })) ?? [{ id: 'out', label: 'Output' }]
	};
}

export function addInventoryItem(graph: ArchitectureGraph, item: InventoryItem): ArchitectureGraph {
	if (graph.nodes.some((node) => node.id === item.id)) return graph;
	return { ...graph, nodes: [...graph.nodes, materializeInventoryItem(item)] };
}
