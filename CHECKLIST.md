# Release checklist

Run this against the exact release commit. Checkboxes are review prompts, not evidence
that the template or a generated product has already passed each item.

## Template and application baseline

- [ ] `bun install --frozen-lockfile` succeeds with the declared runtimes.
- [ ] `bun run verify`, `bun run test:e2e` and `bun run test:dev` pass without ignored errors.
- [ ] Landing, dashboard, live data, private notes, assistant, settings and unknown routes behave correctly.
- [ ] Desktop, narrow phone, keyboard, menu focus and contained scrolling are verified.
- [ ] Public identity, locale, page titles and metadata reflect the product configuration.
- [ ] Assets and prompts are regenerated when config changes; custom assets survive regeneration.
- [ ] `bun run assets:check` passes; actual artwork is reviewed at small/mobile sizes.
- [ ] The clean clone builds without secrets and unused integrations remain disabled.
- [ ] Generated Convex files are current; changed backend functions have development/local smoke evidence.
- [ ] Environment examples document the executing runtime; no private values reach public files or Git.
- [ ] Version manifest, package metadata and changelog agree.
- [ ] README commands and agent guides match implemented behavior and known limitations.
- [ ] New-session entry points link the current contract and relevant guides; no duplicate skill dump or stale project decision remains.
- [ ] Environment values identify their actual consumer; recipe-only cloud service settings do not claim working features.
- [ ] GitHub CI passes for the exact release commit and the release tag points to it.

## Activated product capabilities

Apply only the rows relevant to the product; record omissions explicitly in its PRD.

- [ ] Acceptance criteria have real evidence, including denied, empty, failed and retry states.
- [ ] Private Convex functions validate, authorize ownership/tenancy and use bounded/indexed reads.
- [ ] Auth refresh, sign-out, expired tokens and wrong-owner/tenant denial are tested.
- [ ] Payment lifecycle passes merchant sandbox tests, including invalid signatures, duplicates,
      reordered events, amount/currency mismatch and timeout reconciliation.
- [ ] Email has authorized recipients, a verified sender, durable duplicate/retry handling and delivery evidence.
- [ ] Optional GCP workload has explicit identity, least-privilege access, cost limits and recovery tests.
- [ ] Production has the intended HTTPS `PUBLIC_SITE_URL` and deliberate `PUBLIC_SEO_INDEXABLE` setting; previews remain noindex.
- [ ] Canonical/sharing images resolve on the deployed origin; no placeholder remains where final art is required.
- [ ] Hosting reports the expected commit; frontend/backend environment and release versions are verified.
- [ ] Rollback, schema/data compatibility, operational owners and backup/restore steps are documented.

Mocked transport checks do not complete provider lifecycle rows. Follow the product
[PRD](docs/prd-template.md), [integration](docs/integrations.md) and
[deployment](docs/deployment.md) guides for the corresponding evidence.

## Optional capability acceptance

- [ ] Keep disabled capabilities credential-free and cover denied access before enabling them.
- [ ] Google: register the exact callback, configure matching Convex audience, test real login,
      refresh/logout and two-user isolation on the selected deployment.
- [ ] AI/MCP: verify model access, cancellation, provider errors, exact tool review and key
      clearing with a disposable scoped credential; no request-body logging.
- [ ] Run the Node/container smoke test when shipping that target; configure trusted origin
      and verify proxy streaming. Workers is a separate acceptance target.
- [ ] Payment/email products implement durable state, deduplication/reconciliation and sandbox
      lifecycle acceptance before exposing transport calls to users.
