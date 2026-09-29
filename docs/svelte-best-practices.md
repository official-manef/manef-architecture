# Svelte and SvelteKit best practices

Exact versions live in `package.json` and `bun.lock`; compatibility notes live in
[TECHSTACK.md](../TECHSTACK.md). Use the installed APIs and check current official docs
when syntax or behavior is uncertain.

## Components and reactivity

- Use `$state` for local mutable state, `$derived`/`$derived.by` for computed state,
  `$props` for inputs and `$bindable` only for intentional two-way binding.
- Use event attributes and callback props, plus snippets and `{@render}`. Do not add
  legacy `$:`, `export let`, `on:` directives, `createEventDispatcher` or `<slot>`.
- Reserve `$effect` for synchronizing with an external system, such as an observer.
  Clean up subscriptions/listeners. Derived values and event-driven updates do not
  need an effect that copies state between variables.
- Derive values from changing props/route data rather than capturing their initial
  value. Use keyed iteration when item identity matters for editable/reordered lists.
- Prefer a cohesive component to arbitrary line-count splits. Use existing app and
  shadcn-svelte primitives, native semantics and component-local state first.

These conventions follow [Svelte Runes](https://svelte.dev/docs/svelte/what-are-runes)
and the [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide).

## Routing and feature boundaries

Root `slices/<slug>/` owns feature UI and behavior. Routes adapt framework params,
loading, HTTP errors and metadata, then render slice exports. The registry stores a
`loadScreen` dynamic import; the universal loader awaits it so SSR still renders content.
Do not eagerly export screen components from metadata barrels. Cross-slice access uses
`$features/<slug>` barrels; do not reach through another slice's private directories.
Reuse the app registry for the existing `/apps/[slug]` page family. Different route
behavior may justify a different route; a dynamic route is not a universal router.

Keep searchable filters, pagination and shareable state in the URL where appropriate.
Keep drafts and ephemeral controls local unless they need persistence. Return a real
404 for an unknown entity and safe error UI for failed loading. Avoid side effects in
load functions. See [SvelteKit routing](https://svelte.dev/docs/kit/routing) and
[loading data](https://svelte.dev/docs/kit/load).

## Server and browser boundaries

Immutable product config and static registries may be module-level exports. Never put
user/session/token state in a mutable server singleton: server modules may serve more
than one user. Use request-scoped data and component context for per-user state. Do
not assume a component remounts when a route parameter changes.

Keep secrets and provider SDKs in server-only modules or Convex actions. Anything
returned by a server loader may reach the browser; return only what the UI needs.
Access browser APIs only in a browser-safe lifecycle and never during SSR module
initialization. See [state management](https://svelte.dev/docs/kit/state-management)
and [server-only modules](https://svelte.dev/docs/kit/server-only-modules).

Controls that only work with JavaScript stay disabled until their handlers are ready;
keep native links and server forms usable before hydration. The shared segmented
control uses `onMount` for this boundary. Test readiness and keyboard input without
fixed sleeps; see [hydration testing](https://playwright.dev/docs/navigations#hydration).

## Data, forms and errors

Initialize the Convex client at the existing layout boundary. `useQuery` supplies a
reactive result; read its data/loading/error states directly instead of adding an
effect or derived wrapper that refetches. Supply reactive arguments through the
documented getter when they change. Use the documented SvelteKit SSR helpers only
where initial server data benefits the route, with request-scoped credentials.
See [Convex Svelte queries](https://docs.convex.dev/client/svelte/reactivity) and
[SSR](https://docs.convex.dev/client/svelte/sveltekit-server-rendering).

Use semantic forms, explicit labels and appropriate input types. Validate on the
server even when the browser checks the same value. Prevent accidental duplicate
submission, retain recoverable input and connect field errors to their controls.
SvelteKit form actions suit server form work; Convex mutations suit transactional
Convex data changes. Do not invent a second API layer just to wrap the same operation.
See [form actions](https://svelte.dev/docs/kit/form-actions).

Use safe domain errors where a user can recover; keep stack traces, credentials and
provider payloads off the page. Unknown errors need an actionable fallback, not a
swallowed catch or unconditional success toast. Log necessary server context without
personal data. The disabled/unlinked state is distinct from a failed request.

## Verification

Run `bun run check` and `bun run lint` after changes. Use Svelte's current
[AI tooling](https://svelte.dev/docs/ai/overview) or autofixer when available, then
verify behavior; an autofixer is not an acceptance test. Add a focused regression test
for non-trivial behavior. Release gates include `bun run verify`, `bun run test:e2e`
and `bun run test:dev`.

Follow [DESIGN.md](../DESIGN.md) for keyboard, mobile, heading, focus and failure-state
checks. Review the rendered document title, metadata and asset paths after changing
product configuration. Test actual navigation and hydration rather than inspecting
only static component source.

Use the shared loading state for navigation and data waiting, with a descriptive live
status and reduced-motion support. `svelte:boundary` handles rendering failures only;
async event handlers and streams need explicit try/catch, cancellation and safe recovery.
Keep recoverable drafts and partial output after errors. See [Svelte boundaries](https://svelte.dev/docs/svelte/svelte-boundary)
and [universal loading](https://svelte.dev/docs/kit/load#Universal-vs-server).
Typed async/import safeguards are documented in [linting.md](linting.md).
