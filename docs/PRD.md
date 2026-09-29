# MANEF Architecture Inventory — PRD

## Goal

Provide one reusable architecture/inventory feature that visualizes MANEF products, infrastructure and relationships without coupling the graph model to a frontend framework.

## Canonical implementation

- Product: MANEF Architecture Inventory
- Production origin: `https://architecture.manef.dev`
- Canonical UI: Svelte 5 + SvelteKit
- Backend: Convex Cloud, optional until configured
- Runtime hosting: adapter-node on Dokploy
- Reusable contract: `slices/architecture-inventory/index.ts`

## Acceptance

1. Flow and graph layouts share one graph contract.
2. Search, tags, direct/component trace and focus work without backend credentials.
3. Nodes expose multiple labeled input/output ports; one output can connect to multiple inputs.
4. Node/edge edits and JSON import/export validate against the same contract.
5. The TypeScript core can be consumed by SvelteKit and Next.js without framework imports.
6. Private repository/domain inventory is never hardcoded into the reusable public seed.
7. Convex persistence remains opt-in and protected server-side.
8. Release gates include Bun frozen install, check, lint, unit tests, production build and browser smoke when available.
