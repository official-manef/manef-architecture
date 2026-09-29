# Technology contract

`package.json` declares supported dependencies and runtime ranges; `bun.lock` records
the exact installation and `.node-version` selects the tooling runtime. Read those files
for version numbers rather than maintaining another version list here.

| Layer               | Choice / responsibility                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Package manager     | Bun; one committed `bun.lock`                                                              |
| Framework           | Svelte 5 Runes and SvelteKit                                                               |
| Language / build    | Strict TypeScript, Vite                                                                    |
| UI                  | Tailwind CSS 4, source-owned shadcn-svelte, Bits UI and Lucide                             |
| Backend             | Convex with `convex-svelte`; frontend connection optional                                  |
| Deploy              | Vercel by default; optional Node adapter/container for VPS or Cloud Run                    |
| Asset tooling       | Development-only resvg renders SVG placeholders to PNG; files are committed                |
| Verification        | Svelte/TypeScript checks, Prettier, ESLint, Vitest, Playwright and GitHub Actions          |
| Optional auth / AI  | Google OIDC (`openid-client`, `jose`), Vercel AI SDK provider clients and official MCP SDK |
| Optional transports | DOKU Checkout and Resend using server-side fetch and Node crypto where needed              |

## Compatibility and updates

Core framework dependencies remain pinned. Review official compatibility before a
major upgrade, including TypeScript, Vite, the Svelte plugin, adapter and Node runtime.
Regenerate the lockfile with the declared Bun version and verify the complete build.
Dependabot proposes minor/patch updates and separate majors; unsupported TypeScript
and Node-type major updates are excluded by the checked-in policy.

Bun is the package manager and script launcher. Some CLIs still execute through Node,
and Vercel functions are not a Bun HTTP server. Installing Bun alone does not satisfy
the documented toolchain. Adding another package manager or lockfile is not required.

## Boundaries

The app starts without credentials. Convex generated types are committed; its base
notes schema is owner-scoped through verified Google identity. Cross-user/tenant sharing
is product work; local workspace examples do not grant permissions.
Payment/email transports are disabled building blocks verified with mocked HTTP,
not complete business flows. Auth and BYOK AI/MCP are implemented opt-ins; additional
cloud services remain recipes with explicit unsupported resolver states. See [integrations](docs/integrations.md).

shadcn-svelte/Bits UI own accessible controls; shared `app-ui` components own layout;
feature slices compose them; routes adapt SvelteKit. Public app config and the asset
catalog drive branding. Private integration config never belongs in browser data.
See [architecture](docs/architecture.md) and [design](DESIGN.md).

Official references: [SvelteKit](https://svelte.dev/docs/kit),
[Convex Svelte](https://docs.convex.dev/client/svelte/overview),
[Bun](https://bun.sh/docs), [shadcn-svelte](https://www.shadcn-svelte.com/docs).

`cookie` is deliberately overridden to 0.7.2 because the current SvelteKit range includes
an older version affected by [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x).
The public parse/serialize APIs used by this app are compatible and auth/browser gates
cover the change. Remove the override once upstream resolves to a patched version.
