# Optional BYOK chat and MCP

`/apps/assistant` contains real provider chat and a separate, manually operated remote
tool panel. All three capabilities default to disabled, so a clone starts without AI
accounts, API keys or MCP connections. The screen is loaded only when its feature route
opens; provider SDKs and connection settings stay in server modules.

## Access and keys

Set `PUBLIC_SITE_URL` to the exact trusted application origin. Chat and remote-tool
requests require either the [Google session](auth.md) or a private
`CAPABILITY_ACCESS_TOKEN` of at least 32 characters. The latter is an operator credential
for a controlled installation, not a tenant permission model. A user enters it into the
page only when session sign-in is unavailable. Never put it in a `PUBLIC_` variable.

Provider API keys and MCP credentials are supplied separately by the user, with every
request. Password inputs and chat history live only in the mounted page's memory;
clearing the page or navigating away removes them. The starter does not write these
values to cookies, browser storage, Convex, analytics or logs. Requests pass through the
application server to the selected service. Use a trusted HTTPS deployment and disable
request-body/authorization-header logging in hosting, proxies and observability tools.
The remote provider's own retention and billing policies still apply.

POST routes compare `Origin` against configuration, not an incoming `Host` header.
The shared guard accepts no anonymous fallback and applies 20 requests per minute per
principal, with at most 1,024 active in-memory buckets. These are process-local limits;
add an edge/distributed limiter, product quotas and tenant policy before scaling.
The operator credential grants capability access; a provider key is never treated as
application authorization.

## Enable chat

Set `AI_ENABLED=true` and `AI_MODELS_JSON` on the SvelteKit server. The JSON object accepts
the keys `openai`, `anthropic` and `google`, each with an array of approved model IDs.
Include only models verified against your provider account and current provider docs.
There is no automatic model choice or fallback when a selected model is unavailable.

```json
{
	"openai": ["replace-with-approved-model-id"],
	"anthropic": [],
	"google": []
}
```

This example is configuration structure, not a working model ID. After replacing it,
open the Assistant screen, check setup, select the provider/model, enter your own key,
and send a message. Switching providers clears the previous provider key. The page
shows streamed text, partial failures and a stop button. Starting another conversation
uses **Clear keys and conversation**.

The implementation uses the official AI SDK adapters for
[OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai),
[Anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) and
[Google](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai).
Server code fixes their respective HTTPS API hosts and rejects redirects. It does not
accept browser-supplied endpoints, attachments, tools, system messages or extra provider
options. OpenAI response storage is explicitly disabled; this is not a promise that
every provider or hosting system retains no data.

Each request allows at most 16 messages and 32,000 total characters, with 8,000 characters
per user message. Replies stop at 4,096 output tokens or 32,000 characters, with a
60-second deadline and no automatic retries. An approved model must support these
settings. Browser cancellation aborts the upstream request but cannot undo consumed
provider usage. JSON bodies also have a 64 KiB wire limit, which can be reached sooner
with multibyte text. Streaming errors are generic; the supplied key is redacted even if
an upstream response echoes it across text chunks. See the AI SDK's
[streaming API](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) and
[error handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling).

## Connect remote tools

Set `MCP_CLIENT_ENABLED=true` and configure private `MCP_SERVERS_JSON`. Each connection
needs an alias, a final public HTTPS Streamable HTTP endpoint, an authentication header
convention, and an exact allowlist of directly callable tools:

```json
[
	{
		"alias": "approved-service",
		"url": "https://mcp.example.com/mcp",
		"auth": "bearer",
		"tools": ["EXACT_TOOL_NAME"]
	}
]
```

Replace the example endpoint and tool with your service's actual values. The only
supported header conventions are `bearer` and `x-api-key`. The browser receives aliases
only; it supplies a token separately. Credentials must not be embedded in URLs.
Configuration rejects HTTP, IP literals, local names, URL credentials, fragments,
nonstandard ports and common credential query parameters. Configure only trusted
public endpoints under reliable DNS; enforce outbound network policy when your hosting
environment requires protection against DNS changes. Redirects are rejected, so approve
the final endpoint before adding it. Browser requests cannot select an arbitrary URL.

Discovery is on demand through the official MCP
[Streamable HTTP client](https://ts.sdk.modelcontextprotocol.io/client). A connection is
bounded to eight discovery pages, 128 advertised tools and a 15-second deadline; repeated
or incomplete pagination fails. Only tools present in the local allowlist are displayed.
Each response is capped at 2 MiB. Each request owns its connection and closes it in
`finally`, attempting remote session termination with a separate two-second cleanup
deadline when the server uses sessions. There is no global catalog or background poll.

Select a tool, inspect its untrusted description/schema, enter a JSON argument object,
then choose **Review tool call**. The confirmation shows the exact server, tool and
arguments; **Confirm and execute once** submits that snapshot. Server code checks the
allowlist before network access and rediscovers the tool before each call. Arguments
are bounded to 16,000 serialized characters, results to 64,000. Remote servers validate
their tool-specific argument schema. Descriptions and results are displayed as text,
with the supplied credential and configured endpoint redacted.

The model has no connection to these tools and never executes them automatically.
Manual UI confirmation expresses intent for that request; it is not a signed approval
record or an exactly-once transaction guarantee. There are no automatic retries. A
cancelled or failed request may have completed remotely, so inspect the external state
before trying again. Product workflows that require durable approval, idempotency,
audit records or narrower user permissions must implement them before enabling tools
with those requirements. Do not treat a tool's read-only annotation as an authorization
decision.

### Composio

Use a Composio **session with MCP enabled and the direct-tools preset** for new
integrations. Scope the session to one authenticated user and an explicit set of toolkit
tools. Read the endpoint and required headers from `session.mcp.url` and
`session.mcp.headers`; map the returned `x-api-key` or bearer requirement to this
starter's supported auth setting. Supply its credential through the remote-tools panel,
not the endpoint URL. The starter does not create Composio sessions or store their keys.

Follow the current [sessions via MCP](https://docs.composio.dev/docs/sessions-via-mcp)
and [session configuration](https://docs.composio.dev/docs/configuring-sessions) guides.
The direct-tools preset exposes the selected tools without search/execution metatools.
Composio's [legacy standalone MCP API](https://docs.composio.dev/reference/api-reference/mcp)
is deprecated; an existing single-toolkit endpoint can still be configured here while
its owner follows Composio's migration guidance. If an endpoint redirects, approve its
final Streamable HTTP URL first; runtime redirects remain disabled.

This starter deliberately rejects `COMPOSIO_*` router/execution metatools: allowing a
generic execution tool would bypass a direct-tool allowlist. Sessions
using dynamic search/execution metatools are therefore not enabled by this preset. The application
does not provision Composio configurations, complete toolkit OAuth or store connected
accounts. Generated URLs can identify a particular connected user: use them only in a
controlled installation, or add authenticated per-user connection ownership and encrypted
credential storage before offering a multi-tenant connected-account product. An alias
alone does not establish that ownership.

## Expose the read-only MCP server

Independently set `MCP_SERVER_ENABLED=true` and a separate private `MCP_SERVER_TOKEN`
between 32 and 4,096 characters. An external MCP client connects to
`https://your-domain.example/api/mcp/server` using Streamable HTTP and
`Authorization: Bearer <your-server-token>`.

The official SDK's
[Web Standard server transport](https://ts.sdk.modelcontextprotocol.io/server) runs
statelessly and advertises one tool: `starter_status`, with an empty argument object.
It returns package name, version and the configured backend type `convex`; it does not
check deployment health or expose environment values, users or business data. The
endpoint requires constant-time bearer verification and rate limiting. If an Origin
header is present, it must match `PUBLIC_SITE_URL`; non-browser MCP clients may omit it.
There is no trust decision derived from the request Host. Only POST is supported; GET
and DELETE return method-not-allowed for this stateless transport.

This is a controlled bearer-token integration, not a full OAuth authorization server or
a generic proxy to remote tools. To add business tools, define backend authorization,
validated inputs, tenant ownership and data minimization for each tool. Keep this status
endpoint independent of user BYOK credentials.

## Verification and extension boundaries

Focused tests use mock provider streams/HTTP only: configuration rejection, fixed
provider hosts, bounded generation, key redaction, cancellation, actual official MCP
discovery/call serialization, allowlist and confirmation checks, session termination,
pagination failures and the read-only server contract. No paid generation, Composio
account, third-party action or live provider lifecycle is validated by those tests.

Before application release, validate an allowed model and cancellation against your own
provider account, and exercise discovery, a harmless tool, failure and cleanup against
your approved remote server. Confirm that deployment timeouts and proxy buffering allow
streaming. Keep SDK upgrades behind these contract tests. Add provider-specific adapters
only when needed; never turn an environment string into an arbitrary API endpoint or
silently substitute a different provider. See [environment.md](environment.md) for the
actual consumers of every setting.
