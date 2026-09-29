# Linting contract

Run `bun run lint` for formatting, ESLint and the Svelte 5 syntax gate. After a fresh
install, `bun run prepare` creates the SvelteKit types used by typed linting.
`bun run test:unit` also exercises valid and invalid examples through the installed
ESLint configuration. Type checks, browser tests and security review remain separate gates.

## What is checked

| Area                           | Enforced behavior                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authored TypeScript and Svelte | Await or handle promises; reject async callbacks where a void callback is expected; await only thenables; reject known non-Error throw/reject values; cover union/enum switch cases.                                                                                    |
| Svelte templates               | Recommended Svelte checks, accessibility checks and no `{@html}`. Render ordinary strings with `{value}`.                                                                                                                                                               |
| Feature slices                 | Import other slices through their barrels, including lazy imports. Same-slice implementation imports remain allowed.                                                                                                                                                    |
| Browser-capable modules        | No runtime imports of private environment modules, `$lib/server`, `.server` modules, Node built-ins or Convex backend implementations. Type-only imports and the generated Convex client API remain allowed.                                                            |
| Convex modules                 | No SvelteKit aliases/environment/routes, app slices or server integrations. Node built-ins need a `"use node"` action module. Use object function declarations, argument validators and explicit table IDs; avoid query-builder `.filter()` and unbounded `.collect()`. |

The typed scope is `src/`, `slices/`, TypeScript scripts, `assets.config.ts` and
`vite.config.ts`, using the nearest TypeScript project. Unit tests in those paths
receive the async/type rules too. CLI/config files outside that project retain basic
linting. Generated Convex code is ignored; copied shadcn primitives retain basic Svelte
linting and boundary checks, but are excluded from the added typed rules. Keep product
behavior in authored wrappers instead of weakening checks across the generated UI tree.

`no-floating-promises` uses `ignoreVoid: false`: `void save()` does not handle a
rejection. Await/return the promise, or handle rejection explicitly at a boundary
that can show a failure state. A `.catch()` handler must itself handle its work; a
syntactically accepted promise is not proof that its user experience is correct.

## Query limits and exceptions

Use indexes to select relevant documents, then `take(limit)` or `paginate()` to bound
growing reads. Validate any client-supplied limit on the backend. A small fixed lookup
collection can justify one documented line-level exception; include the actual bound
and why it cannot grow unchecked. An index alone does not bound `collect()`.

Ordinary array `.filter()` and unrelated objects with a `collect()` method remain
valid. The local `starter/no-convex-collect` rule checks the receiver's Convex type
declaration. It replaces the upstream plugin's 4.0.0 collect rule because that version
also reports unrelated objects; keep the regression test when reevaluating an upgrade.
Other Convex checks use the official plugin.

Do not disable an entire file to silence one finding. Use a narrow exception with a
reason only when the behavior is intentional and reviewed. Unused ESLint disable
directives fail the gate. New aliases or runtime conventions require updating both
the boundary rule and its fixtures.

## Limits and maintenance

The custom import rules inspect static imports, re-exports, literal dynamic imports
and template literals without interpolation. They resolve the project's known aliases
and relative/absolute paths. They do not perform whole-program dependency analysis,
evaluate computed import paths, or prove that an arbitrary package is browser-safe.
SvelteKit's production build also enforces its server-only import graph.

Lint cannot prove authentication, ownership, tenancy, secret handling, rate limits,
bounded business behavior or live provider correctness. Convex type-based checks can
also lose information behind `any` or unsafe casts. Review those boundaries and test
their allowed and denied behavior; do not replace this with a rule that merely searches
for an auth function name.

Configuration lives in [`eslint.config.js`](../eslint.config.js); the small custom
rules live in [`eslint-boundaries.mjs`](../scripts/eslint-boundaries.mjs) and
[`eslint-convex.mjs`](../scripts/eslint-convex.mjs). Their regression suite is
[`linting.spec.ts`](../src/lib/config/linting.spec.ts), alongside the original
[`boundaries.spec.ts`](../src/lib/config/boundaries.spec.ts).

The implementation follows the official [typed linting setup](https://typescript-eslint.io/getting-started/typed-linting/),
[promise rule semantics](https://typescript-eslint.io/rules/no-floating-promises/),
[Svelte lint setup](https://sveltejs.github.io/eslint-plugin-svelte/user-guide/),
[SvelteKit server-only modules](https://svelte.dev/docs/kit/server-only-modules), and
[Convex ESLint guidance](https://docs.convex.dev/eslint).
