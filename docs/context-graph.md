# MANEF Context Graph

`diagram.manef.dev` is both an interactive diagram editor and a portable context-map surface for agents.

## Context graph rather than only a note graph

The graph stores explicit relationships, input/output ports, status, searchable inventory references, and namespaced facets. An agent can request a bounded view and receive a navigable URL instead of only a screenshot or local vault reference.

## Facet convention

Use namespaced tags for machine-readable context:

- `project:<slug>` — project or workstream
- `platform:<slug>` — runtime, provider, or client surface
- `agent:<slug>` — agent responsibility or provenance
- `kind:<slug>` — product, service, decision, memory, person, document, backend, deployment, etc.
- `source:<slug>` — GitHub, MSO, Gmail, Notion, manual, etc.

Selections are OR-ed inside one namespace and AND-ed across namespaces.

## Navigable views

The `/app` route accepts repeated `tag` and `seed` parameters plus `q`, `mode=flow|graph`, `trace=direct|component`, `focus=1`, and optional `graph=<JSON>` for bounded portable graphs.

The UI can copy the current edited graph plus active view state as a portable URL.

## MCP surface

The MCP endpoint is `/api/mcp/server`. Existing read-only graph tools remain available. Context-graph tools add faceted query and navigable URL generation. Portable graph creation is stateless: the graph is encoded into the URL and validated by the same graph contract before rendering.

Durable personal snapshots remain in Convex. Agent-write persistence should use a dedicated server-side authorization boundary with provenance and access control rather than exposing Convex mutations directly to arbitrary clients.
