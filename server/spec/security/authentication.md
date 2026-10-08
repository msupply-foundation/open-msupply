# Authentication and Session Behaviors

Scope: how requests prove identity — GraphQL session cookie / bearer token, REST support endpoints, sync site credentials — and what is enforced server-side vs by design not at all.

## Invariants

### INV-AUTH-1 — GraphQL auth is per-operation, enforced in the service layer, keyed on `Resource`

Every operational GraphQL operation that touches data calls `validate_auth(ctx, ResourceAccessRequest { resource, store_id, ... })` (`server/service/src/auth.rs`). The server is authoritative: client-side route guards (old/new frontend) are UX, not security. When auditing "X is hidden in the UI", the question that matters is whether the underlying GraphQL operation requests a `Resource` — if it doesn't, that's a server bug regardless of what the client shows.

Special REST cases that must authenticate with the **session cookie** (browser-download endpoints):

- `GET /support/database` — requires ServerAdmin; validated via `validate_request` (`server/server/src/support/database.rs:19-22`, cookie parsing in `server/server/src/support/mod.rs:30-63`). Returns `401` on failure.
- `POST /support/vacuum` — **currently missing auth; this is confirmed finding F-1 and is a bug, not a pinned behavior.** The pinned behavior once fixed: same cookie+ServerAdmin validation as `/support/database`.

### INV-AUTH-2 — Central sync (v5/v6) delegates credential validation to the legacy mSupply server

OMS-central performs **no local validation** of site credentials on v5/v6 sync. `validate_site_auth` (`server/service/src/sync/api/core.rs:303-329`, comment verbatim: "OMS Central does not yet do auth validation for site credentials — So we call Legacy central server for this") forwards the presented credentials to the legacy server at the KV-stored URL and fails closed if legacy errors or is unreachable. Every central sync endpoint goes through it: pull/push/site_status/files (`server/service/src/sync/sync_on_central/mod.rs:67,153,221,303,368,422`). v7/tus validates locally (`server/server/src/central/tus.rs:87`).

**Consequences (pinned):**

- Sync auth strength equals the legacy server's posture; OMS adds nothing (no rate limiting, no lockout).
- Credentials travel on the sync transport; whether that is plaintext is a deployment decision (no default TLS). Treat "sync over untrusted network" as credential-theft exposure until TLS is default.
- If OMS-central ever drops the legacy dependency, local validation *must* replace the delegate before the forward is removed — flag any diff that deletes `validate_site_auth` without landing per-site password verification first.

### INV-AUTH-3 — Initialisation schema is unauthenticated by design

`server/graphql/general/src/lib.rs:665,704` — "Auth is not checked during initialisation stage." Allowed only because everything reachable there is state-gated (see initialisation.md) or side-effect-free status queries. **Rule for future work:** nothing new may be added to `InitialisationQueries`/`InitialisationMutations` unless it is either (a) pure status read, or (b) itself state-gated to `PreInitialisation`.

### INV-AUTH-4 — PII queries require auth + store scoping

Verified per the audit: `me` (own data only); `patients`, `patient`, `patientSearch`, `centralPatientSearch` (auth + patient permission + store access; `centralPatientSearch` additionally central-mode); `contactTraces`, `activityLogs` (auth + store access); `logContents` (ServerAdmin). Any new PII-returning query must pick up the same service-layer checks; a query that returns `name`-table rows without a `HasStoreAccess`-style `ResourceAccessRequest` is a finding.

## How to verify

```text
# Session-cookie auth on support endpoints:
curl -i http://<server>/support/database            # expect 401 without cookie
curl -i -X POST http://<server>/support/vacuum      # expect 401 once F-1 is fixed

# Sync auth delegating to legacy (fails closed):
# point a test site's KV sync URL at an unreachable host, attempt v5 pull —
# expect LegacyServerError, never a silent success.

# Per-operation auth on GraphQL:
cargo nextest run -p graphql
rg 'Resource::[A-Z]' server/graphql/general/src/mutations/ | wc -l   # sanity: most data mutations have one
```
