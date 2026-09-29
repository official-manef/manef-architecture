# MANEF Architecture

Reusable MANEF architecture inventory and graph feature.

- Canonical app: `https://architecture.manef.dev`
- Canonical UI: Svelte 5 + SvelteKit
- Reusable core: framework-neutral TypeScript under `slices/architecture-inventory/`
- Backend: optional Convex Cloud; clean clones work from the bundled public seed
- Production runtime: adapter-node on Dokploy
- Package manager: Bun only

## Why this exists

The product turns MANEF product/infrastructure relationships into an editable graph without coupling the graph contract to one frontend framework. The Svelte workspace is the reference renderer. Next.js consumers reuse the same types and pure graph/inventory functions and can render them with their own UI layer.

The large repository/domain inventory used during discovery is **not** bundled into the reusable source. Runtime/private inventories must be connected through an authorized data adapter.

## Development

```sh
bun install --frozen-lockfile
bun run dev
```

Verification:

```sh
bun run check
bun run lint
bun run test:unit
bun run build
```

See `docs/PRD.md`, `docs/framework-adapters.md`, and `CONTRACT.md`.
