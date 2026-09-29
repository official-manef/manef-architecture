# Framework adapters

The reusable boundary is `slices/architecture-inventory/index.ts`. Its graph and inventory helpers are plain TypeScript and do not import Svelte, React, Next.js, Convex or browser globals.

## SvelteKit

```ts
import { defaultGraph, traceGraph } from '$features/architecture-inventory';

const connected = traceGraph(defaultGraph, ['architecture'], 'component');
```

The canonical MANEF UI imports `ArchitectureInventory` from the same barrel and mounts it from a thin route.

## Next.js

Copy/install the slice core contract and import the same pure functions from the consumer alias:

```ts
import { defaultGraph, traceGraph } from '@/features/architecture-inventory';

export function connectedArchitectureIds() {
	return traceGraph(defaultGraph, ['architecture'], 'component').nodeIds;
}
```

A Next.js consumer can render those contracts with React Flow, SVG, Canvas, or its own design system without changing the data model. Do not import the Svelte component from Next.js; the shared contract is the framework-neutral TypeScript core.
