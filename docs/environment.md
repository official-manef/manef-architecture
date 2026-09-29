# Environment reference

A clean clone runs without credentials. Copy `.env.example` to `.env.local` only when
configuring a capability. Frontend hosting, Convex deployments and infrastructure tools
have separate environments. No secret belongs in a `PUBLIC_` variable or loader result.

## Public settings

| Setting                           | Default | Actual consumer                                                                                                                                    |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_CONVEX_URL`               | Empty   | Root layout connects the browser to the selected Convex deployment.                                                                                |
| `PUBLIC_SITE_URL`                 | Empty   | Canonical/social URLs, auth redirect and API origin checks. HTTPS origin, no path; HTTP loopback allowed locally. Required for auth/AI/MCP client. |
| `PUBLIC_SEO_INDEXABLE`            | `false` | Metadata and crawler endpoints; true requires an origin. Demo app routes remain noindex.                                                           |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Empty   | Google verification meta content only.                                                                                                             |
| `PUBLIC_BING_SITE_VERIFICATION`   | Empty   | Bing verification meta content only.                                                                                                               |
| `PUBLIC_TWITTER_SITE`             | Empty   | Optional `@handle` in Twitter/X metadata.                                                                                                          |

`src/lib/config/metadata.ts` validates public settings. Preview environments stay noindex.
Google/Bing tokens are verification content, not API credentials. See
[Google verification](https://support.google.com/webmasters/answer/9008080) and
[robots metadata](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

## Auth: implemented, off by default

`src/lib/server/auth/config.ts` validates these settings on the SvelteKit server.
Follow [auth.md](auth.md) for the matching Convex issuer/audience setup and test boundaries.

| Setting               | Default  | Actual consumer                                                                               |
| --------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `AUTH_ENABLED`        | `false`  | Enables Google login routes and safe session data.                                            |
| `AUTH_PROVIDER`       | `google` | Only Google OIDC is implemented; unknown providers fail.                                      |
| `AUTH_CLIENT_ID`      | Empty    | Google web client ID; must match the Convex application's audience.                           |
| `AUTH_CLIENT_SECRET`  | Empty    | Private confidential-client credential for code exchange.                                     |
| `AUTH_SESSION_SECRET` | Empty    | 32 random bytes encoded as base64url; encrypts bounded HTTP-only session/transaction cookies. |

Google issuer is fixed by the implemented provider. Legacy recipe placeholders
`AUTH_ISSUER_URL` and `AUTH_AUDIENCE` are removed; arbitrary issuers are not supported
by changing an environment string. Migrate subjects and sessions when changing providers.

## AI and MCP: implemented, off by default

The SvelteKit server validates selection in `src/lib/server/ai/config.ts` and
`src/lib/server/mcp/config.ts`. [AI/MCP setup](ai-mcp.md) documents limits and Composio.

| Setting                   | Default | Actual consumer                                                                                                                |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AI_ENABLED`              | `false` | Enables bounded BYOK chat streaming.                                                                                           |
| `AI_MODELS_JSON`          | Empty   | Approved model IDs grouped by `openai`, `anthropic`, `google`; no automatically selected model.                                |
| `CAPABILITY_ACCESS_TOKEN` | Empty   | Optional private operator bearer credential, at least 32 characters. Google sessions are the normal per-user alternative.      |
| `MCP_CLIENT_ENABLED`      | `false` | Enables discovery and manually confirmed calls to configured remote servers.                                                   |
| `MCP_SERVERS_JSON`        | Empty   | Private aliases, fixed public HTTPS URLs, `bearer`/`x-api-key`, exact tool allowlists. Never put credentials in endpoint URLs. |
| `MCP_SERVER_ENABLED`      | `false` | Enables the read-only `/api/mcp/server` endpoint.                                                                              |
| `MCP_SERVER_TOKEN`        | Empty   | Separate private bearer credential for the MCP server, at least 32 characters.                                                 |

Provider keys and remote MCP credentials come from the current request and stay in memory;
they are not stored in Convex, browser storage or server fallback environment variables.
The application relays them to the selected provider, so use a trusted HTTPS deployment.
Do not enable request-body logging for these routes. Instance-local burst counters protect
small deployments; use an edge/distributed limiter before scaling replicas.

## Payment and email: transport adapters

`src/lib/server/integrations/config.ts` consumes only the requested capability.
These are callable server transports, not public checkout/email workflows.

| Setting                             | Default   | Actual consumer                                            |
| ----------------------------------- | --------- | ---------------------------------------------------------- |
| `PAYMENTS_ENABLED`                  | `false`   | DOKU transport/signature utility activation.               |
| `PAYMENT_PROVIDER`                  | `doku`    | Only the implemented DOKU adapter is accepted.             |
| `DOKU_ENVIRONMENT`                  | `sandbox` | Fixed sandbox/production provider endpoints.               |
| `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY` | Empty     | Required merchant identity and private signing credential. |
| `EMAIL_ENABLED`                     | `false`   | Resend send transport activation.                          |
| `EMAIL_PROVIDER`                    | `resend`  | Only the implemented Resend adapter is accepted.           |
| `RESEND_API_KEY`, `EMAIL_FROM`      | Empty     | Private send key and verified sender.                      |

Pass the executing runtime's environment explicitly. Convex Node actions cannot import
SvelteKit environment modules. Product order transitions, webhook deduplication, outbox
and real merchant/mail acceptance follow [integrations.md](integrations.md).

## Hosting and optional cloud services

| Setting                                                               | Default             | Actual consumer                                                                                                  |
| --------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_TARGET`                                                       | `vercel` when unset | `svelte.config.js`: `vercel` or `node`; unsupported targets fail at build time. Docker selects Node.             |
| `ORIGIN`                                                              | Unset               | Node adapter runtime trusted application origin; align with `PUBLIC_SITE_URL`.                                   |
| `PORT`, `HOST`                                                        | Adapter defaults    | Node server listen settings; Docker listens on `0.0.0.0:3000`.                                                   |
| `GCP_ENABLED`, `CLOUDFLARE_ENABLED`                                   | `false`             | Resolver guards for unimplemented application service adapters; these flags do not deploy infrastructure.        |
| `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_STORAGE_BUCKET`                | Empty               | Recipe-only identifiers for a future selected GCP service.                                                       |
| `GOOGLE_APPLICATION_CREDENTIALS`                                      | Omitted             | Optional local ADC file path used by Google tooling when installed. Cloud Run uses an attached service identity. |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | Empty               | Recipe-only scoped infrastructure API access; ordinary DNS/proxy use needs no runtime token.                     |

The Node artifact/container is suitable for VPS or Cloud Run; account deployment is
product-specific. Cloudflare DNS/proxy can front it. Workers hosting and R2/Turnstile
bindings require the separate integration described in [deployment.md](deployment.md).
A string placeholder does not provision a resource or bridge runtime boundaries.

## Convex deployment

| Setting             | Runtime                        | Consumer                                                             |
| ------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `CONVEX_DEPLOYMENT` | CLI-managed local `.env.local` | Selects the linked development deployment.                           |
| `CONVEX_DEPLOY_KEY` | Hosting/CI secret store        | Deployment script/CLI. Scope preview and production keys separately. |

Backend settings belong on the corresponding Convex deployment, not only the frontend
host. Never copy another project's deployment identifiers, secrets or private files into
a generated repository. Update the example, this table and the actual validator together.
