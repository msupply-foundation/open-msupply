# Frontend and plugin version compatibility

- _Date_: 2026-08-03
- _Deciders_: James Brunskill
- _Status_: PROPOSED
- _Outcome_: Option 1 for the front end (reuse the existing "newest compatible wins" rule, with an
  explicit server-version field), Option 2b for plugins (additive plugin-API column, gated
  server-side)

## Context

Once the front end can arrive by sync
([transport KDD](./2026-08-03_frontend_sync_transport.md)), a site can hold several front-end
bundles and must decide which one it is allowed to run. Separately, frontend plugins are built
against a *host* front end as well as against a server, so "is this plugin compatible?" is now two
questions, not one.

### What we have today

`Version` ([version.rs](../server/repository/src/migrations/version.rs)) is a `major.minor.patch`
plus an ignored pre-release suffix, with one compatibility predicate:

```rust
// self is compatible with app_version if self is not "newer" by (major, minor)
pub fn is_compatible_by_major_and_minor(&self, app_version: &Version) -> bool {
    if self.major != app_version.major { return self.major < app_version.major; }
    self.minor <= app_version.minor
}
```

There is deliberately **no upper bound**: an old report or plugin stays compatible forever, on the
theory that you fix an incompatibility by shipping a newer artefact, not by expiring the old one.
`app_version` comes from the repo-root `package.json`, embedded in the binary.

Both consumers pair that predicate with "newest wins":

- Reports: [`report_filter_method`](../server/service/src/report/report_service.rs) filters to
  compatible versions, groups by `code`, prefers `is_custom`, then takes the highest version.
- Frontend plugins:
  [`bind_frontend_plugin`](../server/service/src/plugin/mod.rs) skips incompatible versions and
  keeps the highest version per `code` in the serving cache.

The central server also already records, per remote site, its `app_name`, `app_version` and
`sync_version` ([site_row.rs](../server/repository/src/db_diesel/site_row.rs)) — so central knows
what the fleet is running, even though nothing uses that for distribution today.

### What changed

**The front end now has its own version line.** It is released from its own repo as `v0.0.231`
(heading for `1.0.0`) while the server is on `3.x`. That breaks an assumption baked into the rule
above: `is_compatible_by_major_and_minor` compares `self` against `app_version` **on the same
number line**. A report version of `2.8.3` means "for server 2.8". A front-end version of `1.2.0`
means nothing at all about which server it needs.

**The front end already gates plugins itself.** The new front end ships a plugin API contract —
`PLUGIN_API_VERSION` and `PLUGIN_API_MIN_SUPPORTED`, two integers, checked by the loader against
the integer a plugin bundle declares
(`src/plugin-sdk/apiVersion.ts`, `src/plugins/validate.ts`, `spec/plugins/rules.md § compatibility
gates` in the front-end repo). A plugin built against a newer API than the host, or older than the
host's floor, is refused and named. That gate exists, works, and is specified — deliberately an
integer pair, never a semver range.

So the three axes are:

| Axis | Question | Status |
| --- | --- | --- |
| Front end ↔ backend | can this server serve this bundle? | new, this KDD |
| Plugin ↔ backend | can this server serve this plugin? | exists (`frontend_plugin.version`) |
| Plugin ↔ front end | can this host load this plugin? | exists client-side; not visible to the server |

### Requirements

1. A site serves the newest front end it can run, with no manual intervention.
2. A site never serves a front end its server cannot support.
3. The front end's version line stays independent of the server's.
4. A site can decide compatibility **from the record alone**, before downloading ~1 MB of bytes
   ([transport KDD](./2026-08-03_frontend_sync_transport.md), requirement 3).
5. A broken bundle can be withdrawn, and a site can get back to a working UI without a working UI.
6. Any sync wire-format change must be backwards compatible with sites that predate it.
7. Targeting a bundle at a subset of sites is out of scope, and its design is deliberately left
   open — this work must not bake in a shape that presumes the answer.

## Options — front end ↔ backend

### Option 1 — Reuse the existing rule, with an explicit server-version field (chosen)

The bundle record carries **two** versions:

- `version` — the front end's own version (`1.2.0`). Identity, and the ordering used to pick the
  newest.
- `server_version` — the server version the bundle was built against (`3.2.0`), i.e. a value on the
  *server's* number line, which is what `is_compatible_by_major_and_minor` needs.

A bundle is servable when `server_version.is_compatible_by_major_and_minor(app_version)`. Among
servable, active, fully-downloaded bundles, the highest `version` wins.

Who sets `server_version`: for the bundled path, central stamps its own app version at publish time
— central packaging pinned that dist for that release, so it is true by construction, and needs no
change in the front-end repo. For the manual-upload path it is supplied at upload (or read from a
manifest in the zip, if the front-end repo adds one).

_Pros:_

- Identical semantics to reports and plugins — one rule to understand, one to test.
- "Compatible forever" holds up here better than it does for reports: a server 4.0 release ships a
  4.0-compatible front end, so the newest-compatible bundle is always the right one. The old bundle
  staying nominally compatible is harmless because it is never the newest.
- Satisfies requirement 4 with two short strings on the record.

_Cons:_

- Two version fields is a thing to explain; getting `server_version` wrong on a manual upload
  produces a bundle that is offered and then fails at runtime.
- No upper bound means a front end is never *excluded* by a server upgrade — correctness depends on
  a newer bundle existing. The `is_active` flag (below) is the manual override when it does not.

### Option 2 — An explicit `[min_server, max_server)` range on the bundle

_Pros:_ genuinely expresses "this front end needs server ≥ 3.2 and is untested above 4.0", and would
let a server upgrade correctly *stop* serving a bundle.

_Cons:_ a second compatibility model alongside the one reports and plugins use; someone must
maintain an upper bound per release, and an upper bound set too tight strands sites on an old UI
with no automatic way forward. Defer until the "compatible forever" rule actually bites.

### Option 3 — Central decides per site, using the `site.app_version` it already records

Central knows every site's version; it could publish per-site rows.

_Cons:_ `changelog` has no `site_id`, so per-site routing does not exist
([changelog filter](../docs/content/docs/sync/changelog-filter/)); building it is a much larger
change. It also moves the decision away from the only party that knows the *truth* about a
multi-device site, where several devices share one site id and can run different binaries.

## Options — plugin ↔ front end

### Option 2a — Leave it entirely client-side (status quo)

The front-end loader already refuses an incompatible plugin, names it, and carries on. Nothing to
build.

_Cons:_ the refusal happens after the bundle has been fetched and evaluated, and the server keeps
advertising a plugin no client can use. There is no server-side view of "this plugin will not work
here", which is what an administrator actually needs.

### Option 2b — Add the plugin-API version to `frontend_plugin` and gate server-side too (chosen)

A new **nullable integer** column on `frontend_plugin` — the plugin API version the bundle was built
against, the same integer the loader already checks. `frontend_plugin.version` keeps its current
meaning (the *server* compatibility axis), unchanged.

The server can then leave the plugin out of discovery when the active front end cannot load it —
provided it knows the active bundle's API pair, which means the dist must declare
`plugin_api_version` / `plugin_api_min_supported` somewhere the server can read after unpacking
(`VERSION.txt` already exists and is served at `/VERSION.txt`; a small `manifest.json` would be
cleaner). That is a cross-repo dependency on open-msupply-frontend.

_Pros:_

- Nullable and `#[serde(default)]` on the wire, so older sites and existing rows are unaffected
  (requirement 6).
- An integer matches the contract the front end already enforces; inventing a parallel semver would
  mean two answers to the same question.
- Server-side gating makes incompatibility visible in admin surfaces rather than only in a browser
  console.

_Cons:_ needs the front-end dist to declare its API pair before the server-side gate can be
switched on. Until then the column is carried but only the client-side gate is live — an acceptable
staging.

### Option 2c — Encode the second axis inside the existing `version` string

_Cons:_ unparseable by `Version`, unqueryable, and invisible in every existing tool.

## Decision

**Front end ↔ backend: Option 1.** Keep `is_compatible_by_major_and_minor` and "newest compatible
wins", and give the bundle record an explicit `server_version` alongside its own `version` so the
existing rule has something on the right number line to compare.

**Plugin ↔ front end: Option 2b.** `frontend_plugin.version` keeps meaning server compatibility; add
a nullable plugin-API integer column for front-end compatibility, backwards compatible on the wire,
with the server-side gate enabled once the dist declares its API pair.

Trade-offs accepted:

- No upper bound on front-end compatibility. If a server upgrade breaks an older bundle, the fix is
  to publish a newer bundle or deactivate the old one — not an automatic exclusion.
- Two version fields on the bundle record, and a manual-upload path where `server_version` can be
  entered wrongly.
- The plugin-API column ships before the gate that consumes it.

## Consequences

- **Selection rule** (server-side, on startup and after every sync integration and activation):
  among `frontend_bundle` rows that are `is_active`, whose `server_version` is compatible with this
  server's app version, and whose bytes are downloaded and sha256-verified, serve the highest
  `version`. If none qualify, serve the installer-shipped baseline in `frontend_dir`. This mirrors
  `report_filter_method` and `bind_frontend_plugin` closely enough that the logic should be
  recognisably the same shape.
- **Withdrawal, not just publication.** `is_active` on the bundle record is the withdrawal
  mechanism (as on `report`): central clears it, the flag syncs, sites fall back to the next best
  bundle — which may be the baseline. Deleting the record works too and should also reclaim disk.
  Neither helps if the site cannot reach central, hence the escape hatch below.
- **The escape hatch stays.** `/old-ui/` is served from `frontend_dir/old-ui` by convention and is
  never touched by sync ([serve_frontend.rs](../server/server/src/serve_frontend.rs)). It remains
  the way a site with a broken front end reaches a working UI. Worth confirming it is reachable
  without the new front end booting at all, and worth considering a companion route that forces the
  baseline new-UI bundle.
- **Upgrades do not clobber a newer synced bundle.** After a server upgrade, the selection rule runs
  again: if the synced bundle is still compatible and still the highest `version`, it keeps serving,
  even though the installer shipped a different baseline. The baseline only wins when it is newer or
  the synced bundle stops qualifying. This is a consequence worth stating explicitly because it is
  surprising the first time.
- **Targeting is left entirely open** (requirement 7). Every site receives every bundle record, and
  the only thing narrowing what it runs is its own compatibility check. Wanting different sites to
  get different bundles is real — canary rollouts, customer-specific builds, a reduced UI for
  multi-device sites — and the same need exists for reports ("show this report only to stores with a
  dispensary"). But a single label such as a release channel is the wrong shape for that: the need
  is a **selector** over site and store attributes (tags, capabilities, store preferences), possibly
  extending to a customer-supplied compatibility check shipped as a plugin. Because that design is
  not settled, **nothing is provisioned for it here** — no column, no wire-format placeholder. We
  knowingly accept that adding it later may require a wire-format change, in exchange for not
  committing to a shape we would have to unpick. It is a separate action, and an approach should be
  proposed before this work ships.
- **Multi-device sites.** Several devices share a site id, each running their own binary at
  potentially different versions. Because the decision is local, each device independently picks the
  bundle it can run. The cost is that each downloads its own copy from central. Accepted.
- **Front-end version semantics.** `v0.0.x` is not yet semver-meaningful; this design assumes it
  becomes so at `1.0.0`. Until then, ordering by `version` still works (it is monotonic per release)
  but "major/minor" carries no promise — which is fine, because the compatibility check is on
  `server_version`, not on `version`.
- **Translations need no special handling.** The front end's dictionary cache is keyed on a
  `LANG_VERSION` token minted per production build (`vite.config.ts`), so a new bundle busts the
  localStorage cache and new keys appear on first load. Server-supplied `custom-translations` are
  fetched live and unaffected. Worth a test rather than a mechanism.
