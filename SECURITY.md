# Security policy

Security fixes target the latest released template. Generated repositories are independent:
their maintainers must apply updates and review their own dependencies and authentication.

Do not put vulnerabilities, tokens, deployment keys or personal data in public issues.
Use [GitHub private vulnerability reporting](https://github.com/rahmanef63/template-svelte-convex-starter/security/advisories/new)
when available. If it is unavailable, contact the maintainer through the contact information
on their GitHub profile before sharing sensitive details.

The shipped Convex endpoint returns public template metadata. No user database, login,
authorization provider, email delivery or payment handling is configured. Before adding private
data, select an auth provider, configure its issuer, and enforce authorization in every relevant
Convex function. Hiding UI is not an access check.

`PUBLIC_*` values are browser-visible. Store deployment keys only in the hosting provider's
secret environment and function secrets on the Convex deployment. Scope production deploy keys
to Production; previews require their own deployments and keys. Do not run untrusted PR code
with production credentials.
