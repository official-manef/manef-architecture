export type ArchitecturePort = {
	id: string;
	label: string;
	kind?: string;
};

export type NodeStatus = 'active' | 'proposed' | 'private';

export type ArchitectureNode = {
	id: string;
	label: string;
	subtitle?: string;
	tags: string[];
	group?: string;
	status?: NodeStatus;
	level?: number;
	inputs: ArchitecturePort[];
	outputs: ArchitecturePort[];
};

export type ArchitectureEdge = {
	id: string;
	source: string;
	sourcePort: string;
	target: string;
	targetPort: string;
	label?: string;
	tags?: string[];
};

export type ArchitectureGraph = {
	schemaVersion: 1;
	nodes: ArchitectureNode[];
	edges: ArchitectureEdge[];
};

export type InventoryItem = {
	id: string;
	label: string;
	subtitle?: string;
	tags: string[];
	group?: string;
	status?: NodeStatus;
	inputs?: ArchitecturePort[];
	outputs?: ArchitecturePort[];
};

export type TraceMode = 'direct' | 'component';
export type DiagramMode = 'flow' | 'graph';

export type TraceResult = {
	nodeIds: string[];
	edgeIds: string[];
};

export type Point = { x: number; y: number };
