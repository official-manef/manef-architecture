# MANEF WorkOS sign-in

MANEF uses the existing WorkOS project as its identity source. Google OAuth credentials
belong to the MANEF Google Cloud project and stay in the WorkOS Google integration.
Diagram is an application consumer, not another Google OAuth project.

## Deployment order

1. Configure and enable Google in the intended WorkOS Production environment.
2. Register `https://diagram.manef.dev/auth/callback` as an allowed WorkOS application
   redirect. This is distinct from Google's redirect back to WorkOS.
3. Deploy the WorkOS-capable application code. Keep authentication disabled in unlinked
   previews or use a separate staging environment; do not copy production secrets to CI.
4. Configure the server with `AUTH_ENABLED=true`, `AUTH_PROVIDER=workos`, the intended
   `WORKOS_CLIENT_ID`, its private `WORKOS_API_KEY`, a valid `AUTH_SESSION_SECRET`, and
   `PUBLIC_SITE_URL=https://diagram.manef.dev`. Existing variable names alone do not
   prove that their values are configured. Never paste secret values into chat or commits.
5. On the exact linked Convex deployment, set the same public `WORKOS_CLIENT_ID` and
   deploy `src/convex/auth.config.ts`. Frontend deployments do not deploy Convex settings.
6. Verify the login redirect, real Google consent, callback, session refresh, and an
   owner-isolated private data operation before declaring production authentication done.

### Repository deployment workflow

The manual `Deploy Convex authentication` workflow performs step 5 for the linked
production backend, `dutiful-zebra-689`. It runs only from `main`, verifies the source
before remote changes, and rejects keys for other deployments.

In the repository's private Actions secrets settings, configure `CONVEX_DEPLOY_KEY`
with a production deployment key scoped to `dutiful-zebra-689`. It needs the
`deployment:deploy` and `deployment:env:write` permissions. Do not put this key in
Actions variables, workflow inputs, source, or chat.

Run the workflow from GitHub Actions using the public WorkOS Client ID that matches
the production frontend. Its initial default comes from the verified Vercel
Production setting; update it if the frontend's identity environment changes.
The workflow sets the backend variable and deploys the checked-in Convex schema,
functions, and authentication configuration. It does not perform user login or prove
real consent, callback, refresh, or private-data acceptance; step 6 remains required.

## Security contract

The browser is sent to WorkOS AuthKit with state and S256 PKCE. The consumed encrypted
transaction binds the authorization code to its browser, provider, and application.
Code exchange uses the server's WorkOS credential and fixed HTTPS endpoints. The JWT
signature, issuer, expiry, subject, and session identifier are validated. A legacy
shared issuer requires the application audience; an application-scoped issuer is
checked against the exact configured client. OAuth provider tokens are not retained.

WorkOS cookies have a separate name from legacy Google cookies and remain host-only,
HttpOnly, Secure on HTTPS, and SameSite=Lax. The one-hour absolute local session limit
remains. Refresh rotation does not extend it. The existing `/auth/token` response field
`idToken` carries the verified WorkOS access JWT for the Convex adapter; it is never
serialized into page data. Private ownership is based on stable issuer and subject,
not email. Existing Google-owned data is not silently linked or migrated by email.

Local sign-out is still a same-origin POST that clears this browser's cookies. It does
not revoke all MANEF sessions or implement WorkOS-wide logout. Large provider responses
can require a new sign-in when a refresh credential cannot fit in the bounded cookie.
Custom WorkOS auth domains need a separately reviewed issuer configuration; this
implementation deliberately permits only the documented default WorkOS origins.

The public landing and bundled demo graph must not load personal inventory or private
context. This authentication change does not claim the pending private graph editor,
agent-write API, cross-subdomain session flow, or full demo redesign is complete.

Sources:

- https://workos.com/docs/reference/authkit/authentication/code
- https://workos.com/docs/authkit/sessions
- https://docs.convex.dev/auth/authkit/add-to-app
