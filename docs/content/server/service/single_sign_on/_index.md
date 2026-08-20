+++
title = "Single sign-on (Keycloak)"
weight = 30
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Single sign-on (Keycloak)

Open mSupply can authenticate users against an OpenID Connect provider — Keycloak is what this was
built and tested against, but nothing here is Keycloak-specific beyond the defaults.

Keycloak proves **who** the user is. What they may do always comes from an mSupply
`user_account` — this never creates users or store joins, which stay owned by mSupply sync. Which
account, and how its permissions are arrived at, is `account_source`:

Two independent choices: **which account** (`account_source`) and **where its permissions come
from** (`permission_source`).

| `account_source` | The session runs as | The user must exist in mSupply |
| --- | --- | --- |
| `username_claim` (default) | the **person's** own account, matched on the username claim | yes |
| `group` | the account named by the person's **group**, shared by everyone in it | no — only the group accounts must |

| `permission_source` | Permissions | Needs a roles claim in the ID token |
| --- | --- | --- |
| `roles` (default) | granted from the roles Keycloak returns, via permission groups — and a user whose roles match **no** group is refused | yes |
| `account` | the signed-in account's own mSupply permissions, full stop. Keycloak only proves who you are | no |

`permission_source` only bites under `account_source: username_claim`: `group` already answers both
questions, since the session *is* the group's account.

Either way the account must be active and joined to a store on this site.

Single sign-on is off unless the `oidc` block is present in the server config. Password login is
unaffected either way, and both can be used side by side.

## Which mode do you want?

**The simplest thing that works** is `username_claim` + `permission_source: account`: Keycloak
authenticates the person, and mSupply's own record for that username decides everything else. Users
are managed in mSupply exactly as they are today — the only change is *how* they prove who they are,
so there is nothing to configure in Keycloak beyond the client itself, and no roles or groups to
map. Start here unless you specifically want mSupply permissions driven from the realm.

**`group`** if Keycloak is where people are managed and mSupply only needs to know *what kind* of
user this is. You create one mSupply account per group — `role_dispensary`, `role_stock_manager` —
give each the permissions that job needs, and everyone in the matching Keycloak group signs in as
it. Nobody has to be created twice.

The cost is **attribution**: every action by everyone in a group is recorded against that one
account, so `activity_log` and the `user_id` on records cannot tell two dispensary staff apart. Who
actually signed in is written to the server log and nowhere else. If per-person history matters —
and for a dispensary it usually does — use `username_claim`.

**`username_claim`** if each person needs their own mSupply identity. They must exist in mSupply
(synced as usual), and their Keycloak roles decide what they may do; see
[What the roles do](#what-the-roles-do).

## The flow

1. The user clicks **Sign in with Keycloak** on the login page, which sends the browser to
   `/auth/oidc/login`.
2. The server mints `state`, a PKCE verifier and a nonce, remembers them in memory (10 minutes), and
   redirects to Keycloak's authorization endpoint.
3. The user authenticates with Keycloak, which redirects back to `/auth/oidc/callback` with a code.
4. The server exchanges the code for an ID token at Keycloak's token endpoint (PKCE, plus the client
   secret for a confidential client), then verifies the token: signature against the realm's
   published keys, `iss`, `aud`/`azp`, `exp`/`nbf`, and the `nonce` minted in step 2.
5. The account is resolved — from the username claim, or from the groups claim — and, under
   `username_claim`, the roles claim is matched to permission groups.
6. The server issues the same opaque session cookie the password login issues, and lands the browser
   back on whatever the front end asked to return to, with `sso=success` appended.
7. The front end takes it from there — either adopting the session at its login route, or simply
   re-establishing the user from the cookie on the fresh load (see [Endpoints](#endpoints)).

No token ever reaches the browser: the flow runs server-side, and the browser only ever holds the
`session_<port>` cookie.

One detail of step 6 is deliberate: the callback answers with a **page that navigates**, not a
redirect. The session cookie is `SameSite=Strict`, and browsers won't attach a Strict cookie to a
navigation a cross-site page started — which is what the provider's redirect chain is. Navigating
from a page on our own origin makes the request same-site, so the app's first load is already signed
in.

## Signing in as a group

With `account_source: group`, the group *is* the account:

- Every group in the [groups claim](#configuration) has [`role_template_prefix`](#set-role_template_prefix)
  prepended and is looked up as a `user_account`. Group `dispensary` with prefix `role_` resolves to
  the account `role_dispensary`.
- Groups that match no account are ignored — realms hand out groups for all sorts of reasons.
- **Exactly one** must match. None refuses the sign-in ("no mSupply user account matches your
  sign-in"); more than one also refuses, because a person mapped to two mSupply identities makes
  *which user did this* unanswerable. Both name what was tried in the server log.
- Full group paths are fine: Keycloak's *Group Membership* mapper emits `/pharmacy/dispensary` by
  default, and the **last** segment is what is matched, so where a group sits in the hierarchy
  doesn't change which account it maps to.

Nothing else happens — no permissions are granted or revoked, because the session already holds the
account whose permissions mSupply set. The role machinery below does not run in this mode.

**Keycloak sends no group membership by default.** Add a *Group Membership* mapper to the client (or
to a client scope it uses); `groups` is that mapper's default claim name, which is `group_claim`'s
default here.

## What the roles do

Only with `account_source: username_claim` **and** `permission_source: roles` (the default). For
each role in the token:

- The role name, with `role_template_prefix` prepended, is looked up as a user account. Role
  `dispensary` with prefix `role_` resolves to the account `role_dispensary`.
- That account's permissions are collected — the *types*, not their store scoping.
- Those permissions are granted to the user in **every store the user already has access to**.

Roles that don't resolve to an account are ignored (realms hand out roles like `offline_access` that
mean nothing here). If *none* of the user's roles resolve, the sign-in is refused.

Grants are rewritten on every sign-in, so a role removed in Keycloak loses its permissions the next
time the user signs in. They are recognisable by their row id, which means:

- permissions delivered by sync are never touched by this, and
- grants are never queued for sync — central stays the sole author of the permissions it
  distributes, and a group's effect is local to the site the user signed in to.

### Limits by design

- **A group cannot widen store access.** `StoreAccess` is never copied from a group, and grants are
  only written for stores where the user already has it. A group adds capabilities *inside* stores
  the user can already log into; it cannot hand out a new store.
- **A group cannot create a user.** The account must already exist locally and be active on this
  site. Users and store joins stay owned by mSupply sync. (An SSO-only account needs no mSupply
  password.)
- **A role naming the signing-in user's own account is ignored**, as is a role resolving to a
  deactivated account.

### Set `role_template_prefix`

It applies to whichever name is looked up as an account: the **role** under `username_claim`, the
**group** under `group`.

Without a prefix, any realm role or group that happens to share a name with a real mSupply user
resolves to that user — which means whoever administers the realm can reach a privileged account's
permissions by naming a role after it, or, under `account_source: group`, **sign in as that account
outright** by creating a group with its name. With a prefix, only accounts deliberately named
`role_<something>` are reachable. The server logs a warning at startup when it isn't set.

## Configuration

```yaml
oidc:
  issuer: "https://keycloak.example.org/realms/msupply"
  client_id: "open-msupply"
  # client_secret: "..."          # confidential clients only; public clients use PKCE alone
  redirect_url: "https://oms.example.org/auth/oidc/callback"
  role_template_prefix: "role_"
  # account_source: username_claim   # or: group
  # permission_source: roles         # or: account (Keycloak proves identity only)
  # scopes: [openid, profile, email]
  # username_claim: preferred_username   # username_claim mode
  # roles_claim: realm_access.roles      # username_claim mode
  # group_claim: groups                  # group mode
  # button_label: "Sign in with Keycloak"
```

Keycloak for identity only — mSupply keeps deciding permissions:

```yaml
oidc:
  issuer: "https://keycloak.example.org/realms/msupply"
  client_id: "open-msupply"
  redirect_url: "https://oms.example.org/auth/oidc/callback"
  permission_source: account
```

Signing in as a group instead:

```yaml
oidc:
  issuer: "https://keycloak.example.org/realms/msupply"
  client_id: "open-msupply"
  redirect_url: "https://oms.example.org/auth/oidc/callback"
  account_source: group
  role_template_prefix: "role_"
```

| Setting | Default | Notes |
| --- | --- | --- |
| `issuer` | — | Realm URL. Discovery is fetched from `{issuer}/.well-known/openid-configuration`; the ID token's `iss` must match exactly. |
| `client_id` | — | Client registered in the realm. |
| `client_secret` | none | Confidential clients only. Sent with HTTP Basic (`client_secret_basic`). |
| `redirect_url` | — | Absolute URL of this server's `/auth/oidc/callback`. Must be registered verbatim on the Keycloak client. |
| `scopes` | `[openid, profile, email]` | Must include `openid`, or no ID token is issued. |
| `account_source` | `username_claim` | `username_claim` or `group` — see [above](#which-mode-do-you-want). |
| `permission_source` | `roles` | `roles` or `account`. `account` means Keycloak proves identity only; no roles claim is needed and stale role grants are cleared on sign-in. Ignored under `account_source: group`. |
| `username_claim` | `preferred_username` | Matched case-insensitively against `user_account.username`. Under `group` it only names the person in the log, and may be absent. |
| `roles_claim` | `realm_access.roles` | `username_claim` mode only. Dotted path; client roles live in `resource_access.<client_id>.roles`. Accepts an array of strings or a single space-separated string. |
| `group_claim` | `groups` | `group` mode only. Dotted path to the groups claim. Needs a *Group Membership* mapper on the Keycloak client — nothing is sent by default. Full paths and plain names both work. |
| `role_template_prefix` | none | Applies to the role or the group, whichever is being looked up. See above — set it. |
| `logout_from_provider` | `false` | End the Keycloak session when the user logs out of mSupply. See [Logging out](#logging-out). |
| `button_label` | `Sign in with Keycloak` | Login page button text. |

Misconfiguration (unparseable issuer, relative `redirect_url`, missing `openid` scope) is a startup
error rather than a silent fallback to password-only login. Keycloak itself is not contacted until
the first sign-in, so a provider that is down doesn't stop the server from starting.

## Keycloak setup

1. Create a client in the realm with the standard flow enabled.
2. Set the valid redirect URI to the server's `/auth/oidc/callback`.
3. Leave it public (PKCE) or make it confidential and set `client_secret`.
   With `logout_from_provider`, also add the app's URL to **Valid post logout redirect URIs**.
4. **`username_claim` mode:** create a realm **role** per mSupply permission group, named
   `role_<group>` to match `role_template_prefix`, and assign roles to users.
   **`group` mode:** create a **group** per mSupply account instead, named the same way, add users
   to it, and add a *Group Membership* mapper to the client so the `groups` claim is actually sent.
5. In mSupply, create a user account per group (`role_<group>`). Under `username_claim` give it the
   permissions that role should have, in any store; under `group` give it the permissions **and**
   the store joins its users need, since that account is what they sign in as.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /auth/oidc/config` | Whether SSO is enabled, and the button label. Used by the login page. |
| `GET /auth/oidc/login?redirect=…` | Starts the flow. `redirect` must be a path on this server, or an absolute URL on one of the configured `cors_origins` — the latter is how the front end returns to its own origin in development, where it is served from its dev server rather than by the API. |
| `GET /auth/oidc/callback` | Keycloak's redirect target. Ends with the session cookie set. |
| `GET /auth/oidc/logout?redirect=…` | Revokes the session, clears the cookie, then redirects — to Keycloak's `end_session_endpoint` for a session Keycloak authenticated, or straight to `redirect` otherwise. Present only when `logout_from_provider` is set. |

All three are unauthenticated — they are how a user becomes authenticated.

Both outcomes return the browser to whatever `redirect` named, with a marker appended: `sso=success`,
or `oidcError=<slug>` on failure. The slug is deliberately vague (`failed`, `expired`,
`unknown-user`, `no-site-access`, `no-permission-group`, `account-inactive`, `not-configured`); the
reason is in the server log. With no usable `redirect`, the app root is used.

The marker exists because the two front ends need different things, and the server does not choose
for them: a front end that keeps its own client-side session state points `redirect` at its login
route and adopts the session there, while one that re-establishes the user from the cookie on every
load points `redirect` at the URL the user was on and ignores the marker.

## Notes and limitations

- **Sessions, not tokens.** mSupply's session lifetime and inactivity timeout govern the session
  from here; Keycloak's token lifetimes are not tracked, and there is no refresh-token handling. A
  session outliving the Keycloak session is possible.
- **Logout is local by default.** Logging out clears the mSupply session and leaves the Keycloak
  session alone, so the user isn't signed out of unrelated applications. Set
  `logout_from_provider: true` to end the Keycloak session too — see [Logging out](#logging-out).
- **In-memory state.** Pending sign-ins and sessions live in memory, so a server restart mid-flow
  costs the user a retry.
- **Switching to `permission_source: account` cleans up after itself.** Grants written by earlier
  `roles` sign-ins are removed on the user's next sign-in, so "the account's own permissions" is
  true rather than aspirational. Permissions delivered by sync are never touched.
- **Grants persist until the next sign-in.** They are rewritten at sign-in, not revoked at logout, so
  a role change in Keycloak takes effect when the user next signs in. (`username_claim` mode only —
  `group` mode writes no grants at all.)
- **`group` mode gives up per-person attribution.** Everyone in a group shares one mSupply user, so
  the database records their work under that account. The server log is the only place the actual
  person appears. Removing someone from the group in Keycloak stops future sign-ins but does not
  distinguish their past work from anyone else's.

## Logging out

By default logout is local: the mSupply session ends, the Keycloak session doesn't. That is usually
right — a realm-wide sign-out is a bigger action than leaving mSupply, and it would sign the user out
of every other application on the realm. The visible consequence is that signing back in may not ask
for credentials, because Keycloak still has its own session.

`logout_from_provider: true` changes that. Logout then hands the browser to
`GET /auth/oidc/logout`, which revokes the mSupply session, clears the cookie, and **then** redirects
to Keycloak's `end_session_endpoint` (read from discovery). Register the return URL on the Keycloak
client under **Valid post logout redirect URIs**, or Keycloak will refuse the redirect.

Three deliberate properties:

- **Keycloak asks the user to confirm.** No `id_token_hint` is sent, which is what would let it skip
  the prompt. A front-channel hint travels in a URL the **browser** requests, so it would put the
  identity token into browser history and Keycloak's access logs — not worth avoiding one click, and
  the confirmation is honest about the blast radius: every application on the realm, not just this
  one.
- **The mSupply session ends first.** It is revoked before the redirect, so a user who abandons
  Keycloak's confirmation page is still logged out of mSupply. Logging out must not depend on
  finishing a journey through someone else's UI.
- **Password logins are untouched.** Sessions are marked at creation with whether a provider
  authenticated them, and only those reach Keycloak. A password user is simply revoked and lands back
  in the app — which is why it is safe for the front ends to route *every* logout through this
  endpoint.

**Not covered: the reverse direction.** A logout performed in Keycloak — or forced by an admin — does
not end the mSupply session, which keeps sliding for up to an hour of activity. Closing that needs
back-channel logout (an endpoint Keycloak calls, a logout token to validate, and a `sid`/`sub` → session
mapping) and is not implemented.

## Development

Front end and API run on separate ports in development, and the two front ends get there
differently.

`danger_allow_http: true` is needed either way, to run the server over plain HTTP.

**This repo's client (`:3003`)** talks to the API cross-origin, so it sends an absolute return URL.
Add its origin to `cors_origins` — the default `base.yaml` already lists `http://localhost:3003` —
and point Keycloak's redirect URI at the API itself
(`http://localhost:8000/auth/oidc/callback`).

**`open-msupply-frontend` (`:3005`, or a worktree's own port)** proxies every API path through its
dev server, including `/auth`, so it sends a plain path and the whole redirect chain should stay on
the dev origin. Point Keycloak's redirect URI *and* `oidc.redirect_url` at that origin
(`http://localhost:3005/auth/oidc/callback`) — otherwise the flow finishes on the API's own port and
the relative return path resolves against the wrong host.

## Code

- `server/service/src/oidc/` — the flow (`mod.rs`), claim handling (`claims.rs`), discovery and key
  caching (`discovery.rs`), in-flight sign-ins (`pending.rs`), account resolution (`account.rs`),
  role mapping (`role_grant.rs`), orchestration (`login.rs`), and provider-facing tests against a
  stub Keycloak (`flow_tests.rs`).
- `server/server/src/oidc.rs` — the three HTTP endpoints and the session cookie.
- `server/service/src/settings.rs` — `OidcSettings`.
- `client/packages/host/src/components/Login/` — the button (`useOidcConfig.ts`, `Login.tsx`) and the
  `sso=success` bootstrap (`hooks.ts`), which shares
  `client/packages/common/src/authentication/api/hooks/useLogin.ts` with the password login.

Both front ends implement it. The client in this repo is the legacy ("old UI") one; the current front
end lives in `open-msupply-frontend` (pinned by `frontend-version.json`), where the same feature is
`src/auth/singleSignOn.ts` plus its login page, specified in that repo's `spec/startup/`
(rules § single sign-on, and behaviours `OMS-REG-LGN-01.31`–`.34`). It needs no session-adoption step
— its startup current-user check finds the cookie — and it reaches the endpoints through its dev
proxy, so `/auth` must be proxied there and in the deployment nginx configs.
