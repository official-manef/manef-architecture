# Changelog

Notable template changes follow [Semantic Versioning](https://semver.org/).
During 0.x, minor releases may change template structure; patch releases are compatible fixes.

## [0.6.1] - 2026-09-08

- Align Composio setup with the current session-based MCP API and direct-tools preset.
  Keep existing standalone endpoints as a documented legacy migration path.

## [0.6.0] - 2026-09-08

### Added

- Type-aware async/exhaustiveness linting, runtime/slice import boundaries and official
  Convex validator/index/table-ID rules, with executable regression fixtures.
- Optional Google OIDC login, encrypted bounded sessions and owner-scoped Convex notes CRUD.
- Optional BYOK AI chat (OpenAI, Anthropic, Google) and official MCP SDK client/server,
  configured model/tool allowlists, manual execution review and Composio guidance.
- Node adapter and nonroot container target for VPS/Cloud Run deployment.

### Changed

- Override transitive cookie to patched 0.7.2; auth/browser checks cover the compatible API.
- Feature screens load on demand while retaining initial SSR; navigation/data waiting
  use accessible skeletons, render retry boundaries and safe error correlation IDs.
- Agent contract and focused guides cover auth, AI/MCP, typed lint and deployment limits.
- Auth recipe placeholders are replaced by actual Google settings; all new capabilities
  remain off in a clean clone. No provider credentials or private project source is included.

## Unreleased

## 0.5.0 — 2026-09-08

### Added

- A compact session entry point and maintained `CONTRACT.md`, with task-specific context loading and practical Ponytail/Caveman/optional RTK guidance.
- An environment consumer matrix and optional OIDC, GCP and Cloudflare configuration examples; Cloudflare has the same explicit unsupported guard as the auth/GCP recipes.
- Explicit SEO indexing opt-in, optional Google/Bing verification and Twitter/X attribution, plus robots and sitemap endpoints driven by shared settings.
- A development-server browser smoke check in CI alongside production browser coverage.

### Changed

- Design guidance addresses concrete copy, truthful state, accessible controls and context-dependent visual choices. Landing, settings and Convex setup copy reflect actual behavior.
- Removed the unused Svelte Testing Library dependency; browser and existing unit checks remain the verification tools.
- Allowed root feature slices through Vite's development filesystem boundary so their client modules load; unrelated root files remain outside the allowlist.
- Segmented controls and the workspace menu stay disabled until hydration so early keyboard/click input is not silently lost.
- Native disclosures retain an early open state across hydration; removed their unused controlled-state API.
- Updated CI actions for the supported runner runtime, pinned their release commits and disabled persisted checkout credentials.

### Migration notes

- `PUBLIC_SITE_URL` alone no longer enables indexing. Set `PUBLIC_SEO_INDEXABLE=true` for public production indexing; keep previews false.
- Replace the old static robots file with the endpoint. Crawling stays allowed so noindex is readable; sitemap URLs are announced only when indexing is enabled.
- Read `CONTRACT.md` at each new agent session and adapt its product section when generating an application. Optional cloud/auth values are recipes, not installed integrations.

## 0.4.0 — 2026-09-08

### Added

- Public app identity configuration and a shared asset catalog for branding and metadata.
- Eight replaceable SVG/PNG placeholders, a web manifest, asset validation and generated artwork prompts.
- Canonical and social metadata using `PUBLIC_SITE_URL`; unconfigured pages and app examples remain noindex.
- Disabled server transport adapters for basic DOKU Checkout, notification signature verification and Resend email, with mocked HTTP checks.
- Explicit private integration resolution, default provider choices and auth/GCP implementation recipes.
- Canonical design guidance, focused Svelte/Convex practices, an agent startup guide and a reusable PRD with measurable acceptance and operational handoff criteria.

### Changed

- Shared branding, locale and asset references replace duplicated page/shell values.
- The main check command validates generated assets alongside types and version consistency.
- Agent instructions link focused guidance and use cohesive boundaries instead of rigid file-size or library-specific rules.
- Documentation distinguishes implemented transports, mock verification and remaining product lifecycle work.

### Migration notes

- Customize `src/lib/config/app.ts` and `assets.config.ts` together, then regenerate assets and prompts. Mark final artwork `custom` before generation.
- Set the production HTTPS origin through `PUBLIC_SITE_URL`; leave it unset for noindex previews.
- Optional capabilities remain disabled. These adapters add no public callback/order endpoints, durable outbox, authentication or GCP deployment; merchant sandbox and real email lifecycle testing remain product work.
- The base Convex schema stays empty. See [the upgrade guide](docs/releasing.md) when adopting changes in a generated product.

## 0.3.0 — 2026-09-08

### Added

- Public template metadata, MIT license, contributor and security policies, issue/PR templates.
- GitHub CI for locked installs, typecheck, formatting, lint, unit tests, build and browser tests.
- Deployment, architecture, release and new-project guides; an explicit release checklist.
- Version synchronization command and metadata consistency check.
- Deployment key guards to keep Vercel preview and production backends separate.
- Browser metadata, response security headers and keyboard navigation coverage.

### Changed

- Bun pinned to 1.4.2; Node support documented and pinned for CI.
- Dashboard, settings and Convex status read versions from repository metadata.
- Convex status uses generated API types and validates its return value.
- Empty environment example preserves the unlinked first-run experience.
- Preparation errors fail visibly instead of being swallowed.

## 0.2.0 — 2026-08-31

- Existing VPS starter: Svelte 5 Runes, SvelteKit, Bun, shadcn-svelte and optional Convex.
- Root feature slices, registry-driven routes and responsive application shell.
- Dynamic app UI primitives with initial unit and browser coverage.
