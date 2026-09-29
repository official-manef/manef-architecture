# Releasing and upgrading

`version.json` is the template release manifest; `package.json.version` mirrors it.
UI versions derive from repository metadata. The version command never commits, tags,
pushes or publishes, and `bun run check` rejects inconsistent manifests.

## Maintainer release

1. Inspect the worktree and preserve unrelated changes. Follow the repository's review policy.
2. Run `bun run version:bump <MAJOR.MINOR.PATCH>` and add a dated changelog entry with migration notes.
3. If brand/catalog inputs changed, run `assets:generate`, `assets:prompts` and `assets:check`.
   Confirm custom artwork is preserved and commit generated outputs with their inputs.
4. Regenerate `bun.lock` with the declared Bun version when dependency/package metadata requires it.
5. Run `bun install --frozen-lockfile`, `bun run verify`, `bun run test:e2e` and `bun run test:dev`.
6. Complete [CHECKLIST.md](../CHECKLIST.md), commit and obtain green CI on the exact release revision.
7. Tag that commit `v<version>` and publish its GitHub release from the changelog within the authorized scope.

Runtime changes update `packageManager`/`.node-version`, engine ranges and compatibility
guidance together. Stable release names use MAJOR.MINOR.PATCH. During 0.x, minor releases
may change template structure; patch releases are compatible fixes. Do not label a
prerelease stable or count mock-only transport checks as a completed provider lifecycle.

CI actions use full commit pins with release-version comments. Review the existing
Dependabot updates against upstream release notes and keep both values synchronized.

## Upgrade a generated product

GitHub templates create independent repositories. Read upstream release notes, compare
affected files and port the relevant changes onto an application branch. Do not force-merge
unrelated histories or replace customized features with a fresh scaffold.

The generated product owns its release version. Record the upstream template version
adopted in its changelog; do not reset the product's version to match this template.
Run the product's auth/data/integration checks as well as the template gates.

For the 0.4 migration from 0.3:

- Move shared public branding into `src/lib/config/app.ts`; review locale, route metadata
  and the production `PUBLIC_SITE_URL`. Enable `PUBLIC_SEO_INDEXABLE` only when the
  production site should be indexed. Previews keep it false and normally leave the origin unset.
- Adopt the catalog-driven asset references and generated outputs together. Mark existing
  custom artwork `custom` before generation so it is preserved.
- Port optional transports only when useful. They remain disabled and do not replace
  a product's existing order/email/auth implementation or transaction history.
- Read the canonical `AGENTS.md`, `DESIGN.md` and focused implementation guides. Adapt
  the PRD to the product instead of importing historical example requirements.

The historical 0.4 baseline had an empty Convex schema and added no data migration.
A generated product with its own tables must review schema and runtime compatibility.
Provider changes need explicit handling for old transactions, callbacks and identities;
see [integrations](integrations.md).

## Updating from 0.5 to 0.6

The template adds an optional owner-scoped `notes` table and Google auth configuration.
Review name collisions before merging into a product with existing data. Set matching
Google client IDs on frontend and Convex only when enabling auth; an unset ID preserves
the unlinked baseline. Regenerate Convex types after merging schema/functions.

Feature barrels now export metadata and `loadScreen`, not eager screen components.
Update custom registry entries to the lazy API. New typed lint/import checks can reveal
existing Promise or boundary issues; fix those boundaries rather than disabling the gate.
Google settings replace the old auth recipe fields. AI/MCP remain disabled until models,
endpoints, scopes and credentials are configured. Node hosting is selected at build time.
