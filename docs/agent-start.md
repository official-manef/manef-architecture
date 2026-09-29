# Start or resume a product

Each new session starts with [AGENTS.md](../AGENTS.md) and [CONTRACT.md](../CONTRACT.md).
Use [the agent workflow](agent-workflow.md) for current-worktree inspection, concise
updates and verification. Read prior conversation only where current files leave a gap.

## Resume existing work

Inspect the branch, working changes and relevant source. Read `docs/PRD.md` if the product
has one; identify accepted decisions, unfinished acceptance criteria and current blockers.
Preserve unrelated work. Continue the next authorized requirement rather than regenerating
the scaffold or replaying the full history. A small fix needs its acceptance criteria,
not a new product document.

## First product setup

1. Adapt [prd-template.md](prd-template.md) to `docs/PRD.md`: problem, users, scope,
   measurable acceptance, data ownership and operational owner. Reference examples do
   not automatically supply product requirements, clients, dates or integrations.
2. Personalize `src/lib/config/app.ts`, `assets.config.ts` and the shared design tokens.
   Follow [DESIGN.md](../DESIGN.md) and [assets.md](assets.md), regenerate outputs/prompts
   and review rendered identity, icons, metadata and mobile behavior.
3. Update package/repository links, README and attribution. The generated product owns
   its own version history. Configure its public origin and runtime environment through
   [environment.md](environment.md) and [deployment.md](deployment.md), keeping secrets out of public config and Git.
4. Keep unused services disabled. When required, follow [integrations.md](integrations.md)
   for DOKU, Resend, compatible auth or a specific GCP/Cloudflare service. A provider selection is
   not an implemented flow; record real sandbox/denial/retry evidence before user exposure.
5. Adapt the product section in [CONTRACT.md](../CONTRACT.md) and update any changed
   invariant. Keep requirements and owners in the PRD instead of duplicating their values.

Install with `bun install --frozen-lockfile` using the declared runtimes. Establish the
current checks before changing behavior and distinguish pre-existing failures from new ones.
Keep the unlinked frontend usable until the product deliberately requires authentication.

## Build and hand over

Implement one complete journey in a root slice, with thin routes and backend permission
checks. Read [Svelte](svelte-best-practices.md) or [Convex](convex-best-practices.md) guidance
for the affected code. Include empty, denied, failed and retry states with the main outcome.

Run the relevant checks and [release checklist](../CHECKLIST.md) when releasing. Update
acceptance evidence, consequential decisions and remaining work in the product PRD.
Handoff names the revision, changes, checks, untested paths and next authorized step;
it does not require another transcript, status file or copied skill bundle.
