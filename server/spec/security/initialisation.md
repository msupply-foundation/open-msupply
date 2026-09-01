# Initialisation Behaviors

Scope: pre-initialisation, initialising, and operational state transitions — the mutations and triggers that only exist pre-init, and what they may and may not do.

## Invariants

### INV-INIT-1 — Admin creation is state-gated, twice, on the running server

The `initialiseAsCentralServer` mutation runs only when the site is in `PreInitialisation`. Protection is a **duplicated state check** (GraphQL layer + service layer), not schema routing — the mutation is registered in **both** the operational and initialisation schemas (`server/graphql/general/src/lib.rs:586,718`), so the operational schema *does* expose it; post-init rejection comes entirely from state, not routing:

1. GraphQL handler rejects unless `get_initialisation_status == PreInitialisation` (`server/graphql/general/src/mutations/initialise_as_central_server.rs:17-29`).
2. Service layer rejects if the `IsStandaloneCentral` KV flag is already set (`server/service/src/standalone_central.rs:170-174`); the flag is set first inside the same transaction (:65), so a successful call closes its own window.

**Consequence for audits:** claiming "unreachable because the init schema isn't served post-init" is wrong. The guard is state, duplicated, and unit-tested (`standalone_central.rs:259-269` asserts `AlreadyInitialised` on a second call).

**Known residual:** a check-then-act TOCTOU window at first init between the GraphQL guard read and the service transaction commit — two concurrent pre-init requests with *different* admin usernames could in principle both create full-permission admins. Exploitation requires winning a sub-millisecond race against the legitimate installer; today this is accepted. The hardening question (one-time setup token vs localhost-only binding) remains open — see the audit report's Q1.

### INV-INIT-2 — `initialiseSite` may only run pre-init, and cannot re-point a site after UUID pin

The `initialiseSite` mutation is rejected with a hard error unless `PreInitialisation` (`server/graphql/general/src/mutations/initialise_site.rs:31-35`). On success it writes the sync site UUID/site-id from the central server's response, then triggers first sync. Two further guards matter:

- A site with an existing `SettingsSyncSiteUuid` cannot be re-pointed at a different central: `SiteUUIDIsBeingChanged` is raised (`server/service/src/sync/site_auth.rs:107-111`). This is the anti-squatting guard.
- Status moves from `PreInitialisation` → `Initialising` only after a first sync log entry exists (`server/service/src/sync/sync_status/status.rs:270-309`), so a narrow gap exists where settings are written but a second `initialiseSite` call would still pass the state guard — it would then hit the UUID guard (or, with the same UUID, re-write credentials). Bounded to the setup window, no existing data at stake.

**Attack surface summary (pinned):** pre-init, an unauthenticated actor who beats the legitimate configurer can point the site at a malicious central and win: (a) pull-direction poisoning of reference data into the fresh install, (b) squatting that bricks real pairing until a reset. Out of scope post-init because of INV-INIT-2's guard. Whether to harden the pre-init window at all is an open product question.

### INV-INIT-3 — `manualSync` without auth, but only inside an empty-data window

The initialisation-schema variant calls `manual_sync(ctx, with_auth=false)` (`general/src/lib.rs:726-733`); the mutation itself rejects `PreInitialisation` outright (`server/graphql/general/src/mutations/manual_sync.rs:31-38` — "Cannot trigger sync in pre initialisation state"). The operational-schema variant requires `Resource::ManualSync` (`manual_sync.rs:13-21`).

**Result:** the only state in which an unauthenticated `manualSync` succeeds is `Initialising` (settings written, first sync log incomplete). The caller controls no payload and the site holds no data, so the effect is extra load on the configured central. Pinned as **benign**; if `manualSync` ever gains payload-driving parameters, this rule must be re-evaluated.

## How to verify

```text
# Post-init rejection of both init mutations (state guard intact):
curl -s http://<server>/graphql -X POST -H 'Content-Type: application/json' \
  -d '{"query":"mutation { initialiseAsCentralServer(input:{storeName:\"X\",adminUsername:\"x\",adminPassword:\"x\"}) { ... on InitialiseAsCentralServerError { error { description } } } }"}'
# expect: "Server is already initialised"

# init-status source of truth:
rg 'get_initialisation_status' server/service/src/sync/sync_status/status.rs

# regression tests:
cargo nextest run -p service standalone
```
