# Deployment

The starter builds for Vercel by default or a standalone Node server when
`DEPLOY_TARGET=node`. Set this variable in the shell or hosting **build environment**;
an empty or unsupported value fails configuration instead of choosing another host.
Bun manages dependencies and build scripts. Production server code runs on Node.

| Target                             | Build selection                  | Output / runtime                                   |
| ---------------------------------- | -------------------------------- | -------------------------------------------------- |
| Vercel                             | Unset or `DEPLOY_TARGET=vercel`  | Vercel adapter output and supported Node functions |
| VPS, container host, GCP Cloud Run | `DEPLOY_TARGET=node`             | `build/`, started with `node build`                |
| Cloudflare Workers                 | Product integration recipe below | No supported build target in this template yet     |

Run the repository gates before publishing an image or deployment. Commit regenerated
artwork, prompts and manifests first: verification checks asset freshness and does not
create final artwork. See [assets](assets.md) and [the release checklist](../CHECKLIST.md).

## Vercel

Import the generated repository with SvelteKit as the framework and the repository root
as the root directory. Install with `bun install --frozen-lockfile`; build with
`bun run verify`. Install devDependencies because validation and build tooling need them.
Select a supported Node major with the minimum patch listed in `engines.node` and
`.node-version`.

Leave `PUBLIC_CONVEX_URL` unset for the unlinked scaffold or select an already-deployed
backend. This build does not deploy Convex and needs no credentials for the unlinked app.

## Standalone Node and Docker

On a Linux host with the repository's Bun and supported Node installed:

```sh
bun install --frozen-lockfile
DEPLOY_TARGET=node bun run verify
HOST=127.0.0.1 PORT=3000 ORIGIN=http://localhost:3000 node build
```

For a separate runtime directory, ship `build/`, `package.json` and `bun.lock`, then
install production dependencies with
`bun install --production --frozen-lockfile --ignore-scripts`. The ignore flag avoids
running the source project's prepare hook in a directory containing only build output.
Start it with `node build`; the runtime does not need Bun after dependency installation.
Production Node does not automatically read `.env` files. Supply host-managed variables,
or use Node's `--env-file=/path/to/runtime.env` with a private file outside the repository.

The included [Dockerfile](../Dockerfile) builds the Node target, installs the exact Bun
version from `packageManager`, and copies only build output and production dependencies
into a non-root Node runtime. `.dockerignore` excludes local environments and build
artifacts. No service credentials or public production origin are baked into the image.

```sh
docker build --pull -t svelte-convex-starter:local .
docker run --rm --name svelte-convex-starter-local \
  -p 127.0.0.1:3000:3000 \
  -e ORIGIN=http://localhost:3000 \
  svelte-convex-starter:local
```

The default base tracks the supported Node 22 image. For reproducible production
images, pass `--build-arg NODE_IMAGE=<reviewed-node-image@sha256:digest>` and deliberately
update that digest for runtime security patches. Build on the target architecture or
use the host's supported multi-platform builder.

Put a TLS reverse proxy or managed ingress in front of the Node server. Set `ORIGIN`
to its final HTTPS origin and `PUBLIC_SITE_URL` to the same public origin. `ORIGIN`
controls SvelteKit request URLs and form-origin checks; `PUBLIC_SITE_URL` controls app
metadata and configured authentication redirects. Prefer explicit `ORIGIN` over
trusting arbitrary forwarded host/protocol headers. Configure trusted-proxy address
headers only when the proxy strips/replaces client-supplied values.

Preserve streaming responses through the proxy for AI chat; buffering the entire
response defeats incremental output. Run the Node process under the host's supervisor
or container lifecycle, and keep runtime files ephemeral: persistent data belongs in
Convex or an explicitly implemented storage integration.

## GCP Cloud Run

Use the same Node container image. Cloud Run is a hosting choice; it does not replace
Convex or require enabling optional GCP application services.

Publish the image to the product's registry and configure a Cloud Run **service** with
that image, its public origin, and runtime secrets. The server binds `0.0.0.0` and
honors the injected `PORT`; Cloud Run terminates TLS. Set `ORIGIN` and `PUBLIC_SITE_URL`
to the service's final public HTTPS origin before enabling authentication. Map secrets
through the platform's secret facilities, not build arguments.

Set the host's request timeout to accommodate the app's bounded streaming requests,
and use `SHUTDOWN_TIMEOUT=8` to finish adapter shutdown within Cloud Run's termination
window. Verify the configured origin, cookie behavior, response streaming and backend
connection on an actual revision. Container portability is not evidence that a GCP
account, IAM policy, domain or live service has been deployed.

The starter's in-memory abuse counters are per instance. Configure shared quotas/rate
limits when the product needs enforcement across scaled instances; do not treat one
process's counter as a distributed limit.

## Cloudflare options

Cloudflare DNS/CDN can front the Node deployment without changing its adapter. Keep
authenticated responses private and preserve streaming and origin behavior.

Deploying the app inside **Workers** requires a separate verified integration. Use the
maintained `@sveltejs/adapter-cloudflare`, a Wrangler configuration with an explicit
compatibility date and `nodejs_compat`, then validate build size, runtime bindings and
the APIs used by OIDC, crypto, AI and HTTP MCP clients. Node compatibility includes
partial implementations and stubs; the flag alone is not a compatibility guarantee.
Run local Worker tests and a product preview covering enabled flows before adding
`cloudflare` to the accepted targets. The template deliberately has no untested
Wrangler deployment file or Workers support claim.

## Web and Convex deployment

For linked deployment, create the application's own Convex project and separate
development/production deployments. In Vercel Production, set that deployment's
`CONVEX_DEPLOY_KEY` and use `bun run build:deploy` as the build command.

The command runs the full offline gate, including a frontend build, before contacting
Convex. Then `convex deploy` runs the linked web build with `PUBLIC_CONVEX_URL` injected.
For an explicitly selected Node build, the same command produces `build/`; shipping or
running that artifact is still the host's deployment step. Remove a manually configured
URL pointing at another backend. A passing build does not validate provider settings.

The deploy guard requires a preview key in Vercel Preview and a production key in
Production, rejecting mismatches before remote changes. On other hosts, the operator
must select the intended deployment key explicitly; the Vercel environment guard does
not identify those hosts. Prefer separately managed Convex deployment and Node image
publishing when the hosting pipeline needs that separation.

Use isolated Convex preview backends with preview credentials. If they are unavailable,
use an unlinked frontend preview. CI receives no production credentials. Keep backend
keys, provider keys and private data out of untrusted preview environments.

## Runtime environment and indexing

Set public and private app variables on the frontend host. For Convex actions, configure
secrets on the intended Convex deployment separately; host variables do not transfer
there automatically. Consult `.env.example`, the [environment consumer matrix](environment.md),
and [integrations](integrations.md) for activation requirements. Do not expose resolved
private config through page data, logs or public endpoints.

`PUBLIC_SITE_URL` is a public HTTP(S) origin without path, query, fragment or credentials;
production uses HTTPS. It supplies canonical and absolute social-image URLs. Leave it
unset on previews to omit canonical tags. `PUBLIC_SEO_INDEXABLE` defaults false; enable
it only when the public production site should be indexed. Demo `/apps/*` routes remain
noindex. These directives do not provide access control.

Optional credentials and features remain disabled until configured. Test the enabled
authentication, private-data, AI/MCP and provider flows in their real environment.
DOKU/Resend transports still need durable operation records, callback handling and
sandbox lifecycle verification before becoming a product's public payment/email flow.

## Verify and recover

Verify the expected commit, landing/app/error routes, keyboard/mobile behavior,
metadata and sharing images on the deployed domain. Confirm preview noindex behavior
and the intended Convex deployment/version. Exercise success, rejection, cancellation
and expiry paths for the product's enabled capabilities.

Roll back the frontend to a known-good image or commit. Check backend compatibility
before rolling back functions or schema. Data migrations need a separate recovery plan;
frontend rollback cannot restore data or undo external payments/emails. Preserve
operation IDs and reconcile uncertain provider outcomes during incidents.

References: [Node adapter](https://svelte.dev/docs/kit/adapter-node),
[Vercel adapter](https://svelte.dev/docs/kit/adapter-vercel),
[Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract),
[Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare),
[Workers Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/),
[Convex on Vercel](https://docs.convex.dev/production/hosting/vercel).
