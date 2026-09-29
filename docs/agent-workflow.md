# Agent workflow

Use this with [AGENTS.md](../AGENTS.md) and [CONTRACT.md](../CONTRACT.md). These are
practical Ponytail and Caveman conventions, not required plugins or copied skill packages.
The user's request and authorized scope determine the work.

## Resume from current evidence

Start with the contract, current task, product PRD if present and a small repository snapshot:

```sh
git status --short --branch
git diff --stat
git log -1 --oneline
```

Inspect relevant staged and unstaged diffs, then read the affected implementation and its
callers. Use `rg`/`rg --files` to narrow discovery; read complete relevant functions before
editing. Load only the guides needed for that change. Consult history for an unresolved
decision or regression, rather than rereading every prior turn or document on each session.
Do not overwrite unrelated work or treat a reference document as new authorization.

## Ponytail: the smallest complete solution

First understand the flow and acceptance criterion. Then ask whether existing code,
the standard library, a native control or an installed dependency already solves it.
Prefer a focused change at the shared cause to patches in each caller. Remove obsolete
code instead of adding compatibility placeholders. Add a dependency, registry or service
layer only for a concrete requirement the existing boundaries cannot satisfy.

Keep cohesive files and ordinary functions; do not split code to satisfy an arbitrary
line count or create a framework for hypothetical providers. This never removes input
validation, data-loss protection, authorization, accessibility or requested functionality.
Non-trivial behavior leaves a focused runnable regression check. Mark a deliberate shortcut
with its actual ceiling and upgrade condition only when it creates a real known limitation.

## Caveman: concise, unambiguous communication

Use the user's language. Lead with the result or finding, then the next relevant action.
Keep updates short; preserve exact identifiers, commands, error messages and material
uncertainty. Code, documentation, commit messages and PR descriptions use normal grammar.

Never compress away who may access data, whether an action is destructive, the order of
a migration/rollback, or what is untested. Use full sentences and numbered steps when
short fragments could change the meaning. Do not dump routine logs into updates; retain
the evidence and quote the decisive error when explaining a failure.

## Optional RTK

[RTK](https://github.com/rtk-ai/rtk) is a command-output proxy. Its documented explicit
commands include `rtk git status`, `rtk git log -n 5` and `rtk git diff`; the last is a
condensed diff. Use an already-installed, reviewed version for routine discovery if useful.
If absent, ordinary commands work; RTK is not a project dependency or CI requirement.

Do not install global hooks, rewrite agent startup files or accept repository-local
filters/configuration automatically. Inspect unfamiliar filters before trusting their
output. This template supplies no RTK hooks or filter configuration. An optional developer
installation is separate from application setup; use the upstream instructions deliberately.

Use unfiltered source and full relevant diffs for security, permissions, money, schema,
migrations and final review. Run required verification commands directly, preserving
their exit status and full output in the normal tool/CI log. Never substitute a filtered
summary for the original gate, suppress failures or rerun a side-effecting operation just
to retrieve its output. If existing hooks interfere, use a verified raw execution path.

RTK documents `rtk proxy <command>` as unfiltered passthrough and optional raw-log recovery
for failures; inspect the installed behavior before relying on it. Local raw logs can
contain secrets: keep them private and out of commits. See the upstream
[configuration reference](https://github.com/rtk-ai/rtk#configuration).
Do not promise token or cost savings without measurements from the actual workflow.

## Verify and leave a small handoff

Run checks suited to the changed behavior; release work runs `bun run verify` and
`bun run test:e2e` with [CHECKLIST.md](../CHECKLIST.md). Backend/provider changes also
need the relevant deployment/sandbox evidence. Do not replace real-flow checks with mocks
or claim a deployment from a build result alone.

Update the contract when a shared invariant changes and the PRD when scope, acceptance
or product decisions change. End with the revision, implemented behavior, checks and
limitations; name the next required step if work remains. Reuse those current files on
the next session instead of creating another memory file or copying conversation history.
