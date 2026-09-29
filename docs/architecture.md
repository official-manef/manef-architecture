# Architecture

One SvelteKit application owns the web experience; Convex is the default backend for
functions and persisted data. Root feature slices stay independent of framework routes.
The frontend can run unlinked, with no accounts or provider credentials.

```text
/apps/[slug] → load validates slug → registry lazily loads screen and resolves metadata
            → shell renders feature → convex-svelte subscription
            → generated API reference → validated Convex function

app config + asset catalog → page identity, icons, social metadata and manifests
private environment → selected integration resolver → server transport
```

## Sources of truth

| Concern                                              | Source                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Product identity, locale and shared copy             | `src/lib/config/app.ts`                                        |
| Canonical/social metadata                            | `src/lib/config/metadata.ts`, public origin and route metadata |
| Asset paths, sizes, status and briefs                | `assets.config.ts`                                             |
| Feature definitions and navigation                   | `slices/app-shell/registry.ts` and slice definitions           |
| Feature UI and local state                           | `slices/<slug>/`                                               |
| Framework loading, HTTP status and rendering         | `src/routes/`                                                  |
| Schema, private-data authorization and durable state | `src/convex/`                                                  |
| API/data types                                       | Committed `src/convex/_generated/`, produced by Convex codegen |
| UI primitives / design tokens                        | `src/lib/components/` / `src/routes/layout.css`                |
| Private integration choices                          | `src/lib/server/integrations/config.ts`                        |
| Runtime/dependency versions                          | `package.json`, `bun.lock`, `.node-version`                    |
| Release version                                      | `version.json`; version command synchronizes package metadata  |

Immutable config is safe to share. Request identity, authenticated clients, drafts and
mutable user state must not live in a shared server singleton. Public config, asset
briefs and loader output must never contain secrets.

## Add a feature

1. Create `slices/<slug>/components/<slug>-screen.svelte` using Svelte 5 Runes.
2. Export its metadata and `loadScreen` dynamic import from the slice's `index.ts`; follow an existing slice.
3. Add one entry to `APP_REGISTRY`; the existing page family derives navigation and metadata.
4. Add the required Convex schema/functions for persistent data and regenerate types.
5. Implement success, empty, denied, failure and recovery paths; verify behavior and accessibility.

Cross-slice imports use `$features/<slug>` barrels. Thin SvelteKit routes adapt params,
loading and rendering; reusable behavior stays in its slice. A different page family
can have a different route. Shared facts belong in config, while feature-specific copy
and behavior stay local. See [Svelte best practices](svelte-best-practices.md).

## Convex and authorization

`convex.json` selects `src/convex/`; the root layout sets up the client only when
`PUBLIC_CONVEX_URL` exists. Subscriptions are already reactive. Committed codegen lets
a fresh clone typecheck without linking a backend.

`starter.status` returns public version metadata. The `notes` table stores bounded private
notes; every query/mutation checks the verified identity and indexed ownership. Google OIDC
is optional; its server session passes only an ID token through `/auth/token` to Convex,
which verifies its configured issuer/audience independently. Safe session metadata in the
root loader contains no tokens. [Auth setup and limits](auth.md) are part of this boundary.
Workspace switching and settings remain local examples, not a tenancy system.

## Loading and recovery

The universal page loader awaits only the selected slice's `loadScreen` import. This
preserves initial SSR while splitting feature code; the registry never eagerly imports
screens. Client navigation shows a semantic loading skeleton while preserving the current
screen until the next load succeeds. Render boundaries offer retry; event handlers and
network streams handle their own failures. Server errors expose a correlation ID, not
raw provider exceptions. API/auth responses and session-dependent pages are not cached.

## Optional provider boundaries

`createCheckout` and `sendEmail` are small server transport boundaries. Their resolver
receives environment values explicitly, reads only the requested capability and fails
for disabled or unsupported usage. It does not validate all flags during app startup.
Payments prefer DOKU and email prefers Resend when enabled; unused services need no keys.

The included transports/signature helper have mocked HTTP tests. They provide no public
checkout endpoints, order ledger, fulfillment or email outbox. Google auth and BYOK
AI/MCP have dedicated validated server modules; GCP service and Cloudflare Workers
integrations remain recipes. A configuration
flag cannot complete these flows or migrate old transactions to a new provider.

SvelteKit server code uses private env imports. To use a transport from a Convex Node
action, move/extract its runtime-neutral implementation into a backend-owned module,
then supply that deployment environment. Convex cannot import `src/lib/server`,
SvelteKit aliases or environment modules. Keep authorization at the
entry point and durable business state in Convex. See [integrations](integrations.md)
for transport constraints, webhook verification and lifecycle acceptance tests.

## Branding and generated assets

The public app config and catalog drive page titles, descriptions, icons and sharing
images. `PUBLIC_SITE_URL` supplies an explicit canonical origin; incoming host headers
do not choose it. `PUBLIC_SEO_INDEXABLE` defaults false and requires that origin when
enabled. Preview sites and demo app routes are noindex. The robots and sitemap endpoints
use the same settings; only the shipped public landing URL is included in the sitemap.
See [the environment consumer matrix](environment.md).

The asset script writes committed placeholders, file fingerprints and a web manifest;
it preserves entries marked `custom`. This is build tooling, not an AI client or an
offline/PWA runtime. Review artwork and run asset checks after customization. See
[assets](assets.md) and [DESIGN.md](../DESIGN.md).

## BYOK and MCP

[AI/MCP](ai-mcp.md) is request-scoped and optional. The app uses maintained SDKs, fixed
provider endpoints, approved model/tool lists, input/output budgets and cancellation.
MCP discovery is on demand; execution requires review of exact arguments. Tool results
and model output remain plain untrusted text. The read-only MCP server has a separate
credential and exposes template status only. No shell, arbitrary remote URL, automatic
tool loop, server-key fallback or durable conversation store is installed.

[Linter rules](linting.md) check authored TypeScript/Svelte promises, validators and
import boundaries. These gates supplement runtime authorization and behavioral tests.
