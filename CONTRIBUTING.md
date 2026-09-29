# Contributing

Use the Bun version in `package.json` and the Node version in `.node-version`.
Install with `bun install --frozen-lockfile`, create a branch, and read [AGENTS.md](AGENTS.md).

Keep changes focused. Feature UI belongs in `slices/<slug>`; cross-slice imports
use barrel exports. Keep routing in `src/routes` and backend logic in `src/convex`.
Use Svelte 5 Runes, existing shadcn-svelte primitives, and generated Convex types.

Before opening a pull request:

```sh
bun run verify
bunx playwright install chromium
bun run test:e2e
```

Add a regression test for behavior changes. For backend work, prove argument validation,
authentication and ownership where applicable. Regenerate Convex code after adding functions.
For UI work, check keyboard access and narrow mobile layouts. Never include credentials,
`.env.local`, backend state, or generated build output in a commit.

Use descriptive commits such as `fix: preserve keyboard focus in workspace menu`.
Explain the user-visible change and validation in the PR. Update documentation when the
environment, commands or behavior change. Record notable changes under Unreleased in the changelog.

Maintainers bump versions at release time; see [release instructions](docs/releasing.md).
