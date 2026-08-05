# Frontend Sync

## Overview

We want to be able to quickly deliver updates to our frontend to our remote servers (without an upgrade e.g. installing a new version of the application via APK or windows installer)

For this to work, we can leverage our sync system to update the frontend code in place after it's downloaded via sync.

## Reference implementations

_Built in reports_
These are built and commited to git, the distributed as part of the binary. They are versioned so that a new install on central server gets distributed out to remote sites that are compatible.

_plugins_
Plugins aren't bundled with the binary, they are synced to remote sites and are loaded if they are compatible.

## Compatibility Versioning requirements

Frontend Plugins need to have 2 compatibility versions.

1. Are they compatible with backend server infrastructure, e.g. Requries backend > 3.0.0
2. Are they compatible with the frontend code e.g. Requires frontend 3.1.3

The frontend code itself needs to be compatible with the backend version.

## Key decisions

The reasoning behind the design below, and the options rejected along the way, are in two KDDs:

- [Frontend sync — how the bundle reaches a remote site](../../../decisions/2026-08-03_frontend_sync_transport.md)
  — metadata over normal sync, bytes over file sync; how downloads get triggered; how bundles get
  onto central.
- [Frontend and plugin version compatibility](../../../decisions/2026-08-03_frontend_version_compatibility.md)
  — the two version lines, the selection rule, and the plugin compatibility axes.

## Scope

- **v7 sites only**, syncing against an open-mSupply central server. No 4D involvement.
- The **new** front end (served at `/`) only. The old UI at `/old-ui/` is built from this repo and
  ships with the installer; it is not synced.

## Data model

### `frontend_bundle`

A new synced table. One row per published front-end bundle; several rows coexist on a site the same
way several versions of a report do.

| Column | Notes |
| --- | --- |
| `id` | uuid |
| `version` | the front end's own version, e.g. `1.2.0`. Identity and ordering. |
| `server_version` | the server version this bundle was built against, e.g. `3.2.0`. The value the compatibility check uses — it is on the *server's* number line, `version` is not. |
| `sha256` | of the dist zip. Verified after download, before unpacking. |
| `is_active` | withdrawal flag, as on `report`. Central clears it to retire a bundle. |
| `description` / `created_datetime` | provenance for the admin surface. |

Every site that syncs receives every bundle record. Nothing here targets a bundle at a subset of
sites — see [future work](#future-work).

Sync style: authored on **Central**, distribution **Central**, **v7 only**. The record reaches every
site; the site decides what to do with it.

The bundle's bytes are a `sync_file_reference` owned by the row (`table_name = "frontend_bundle"`,
`record_id = <bundle id>`), carrying the dist zip.

### `frontend_plugin`

One new **nullable integer** column: the plugin API version the bundle was built against — the same
integer the front-end loader already checks against its `PLUGIN_API_VERSION` /
`PLUGIN_API_MIN_SUPPORTED` pair.

`frontend_plugin.version` is unchanged and keeps its current meaning: compatibility with the
*server*. Nullable, and defaulted on the wire, so sites and rows that predate this column are
unaffected.

## Publishing on central

Two paths:

1. **Bundled with central** — the normal path, mirroring standard reports. On startup central
   publishes the dist that its own packaging pinned and verified, stamping `server_version` with its
   own app version. Upgrading central is what releases a new front end to the fleet.
2. **Manual upload** — an admin uploads a dist zip, as plugins are installed today. `server_version`
   is supplied at upload. This is the hotfix and customer-specific-build path.

Publishing writes the `frontend_bundle` row, stores the zip in the static file store, and creates
the owning `sync_file_reference`.

## Distribution and download on a remote site

1. The `frontend_bundle` record arrives by normal sync, along with its `sync_file_reference`.
2. A **processor** evaluates the site's bundles after integration and enqueues a download for the
   newest bundle that is `is_active`, whose `server_version` is compatible with this server's app
   version, and whose bytes are not already held. A site never downloads a bundle it could not run.
3. The **file sync driver** drains the download queue in the background, reusing the existing
   status / `retries` / `retry_at` / `error` bookkeeping on `sync_file_reference`. Downloads yield
   to normal sync the same way uploads do.
4. On completion the zip is verified against the record's `sha256`, then unpacked
   **stage-then-swap** into a per-version directory under `base_dir` — never into `frontend_dir`.

> `frontend_dir` is off limits for synced bundles: on Android the app shell deletes and re-copies
> `<filesDir>/frontend` from the APK whenever the app version changes, so anything stored there is
> destroyed by the next upgrade.

A bundle whose bytes are absent, unverified, or incompletely unpacked is never a candidate for
serving.

## Selection and serving

Evaluated at startup, after sync integration, and after a bundle is activated:

> Among `frontend_bundle` rows that are `is_active`, whose `server_version` is compatible with this
> server's app version by major and minor, and whose bytes are downloaded, verified and unpacked —
> serve the highest `version`. If none qualify, serve the baseline in `frontend_dir`.

Compatibility uses the existing `Version::is_compatible_by_major_and_minor`, the same predicate
reports and plugins use. Consequences worth stating explicitly:

- A server upgrade does **not** clobber a newer synced bundle. If the synced bundle still qualifies
  and is still the highest version, it keeps serving even though the installer shipped a different
  baseline.
- There is no upper compatibility bound. A server 4.0 release is expected to ship a 4.0-compatible
  front end, so the newest compatible bundle is the right one; `is_active` is the manual override
  when it is not.

Serving behaviour is otherwise unchanged: `index.html` and `locales/` are `no-cache`, everything
else is `immutable, max-age=1y` over content-hashed filenames.

## Updating a client that is already running

Swapping the served bundle must never discard a user's in-progress work.

- A reload is **user-triggered**. The client surfaces that a new version is available and the user
  chooses when to take it; nothing reloads underneath them mid-task.
- The front end already detects a stale bundle reactively: a content-hashed chunk that 404s raises
  `vite:preloadError`, which triggers one reload and, if it recurs, a "new version available"
  message (`src/staleBundle.ts` in the front-end repo). That is a safety net for a bundle that has
  gone away — it is not proactive notification, and it only fires if the old chunks have actually
  been removed.
- Because previous versions are retained on disk (below), old chunks keep resolving, so the stale
  detector will usually *not* fire. Proactive notification is therefore required, not optional:
  the client needs to learn the active bundle version has changed. `/VERSION.txt` is already served
  from the dist and is the obvious source.
- A reload re-fetches plugins along with the host, which resolves the module-federation shared-scope
  problem: a swapped host and a plugin loaded against the previous host never coexist.
- Translations need no special handling: the dictionary cache is keyed on a per-build `LANG_VERSION`
  token, so new keys appear on the first load of a new bundle. Server-supplied custom translations
  are fetched live.

An Android tablet acting as a server swaps for every LAN client attached to it at once; each client
takes the update on its own reload.

## Withdrawal, rollback and escape hatches

- **Withdraw**: central clears `is_active`. The flag syncs and sites fall back to the next
  qualifying bundle, or the baseline.
- **Delete**: removing the record retires the bundle and reclaims its disk.
- **Escape hatch**: `/old-ui/` is served from `frontend_dir/old-ui`, is never touched by sync, and
  remains reachable when the new front end is broken.

## Retention

Bundles are retained for a bounded number of versions, not deleted on swap: an open tab holds
content-hashed asset URLs from the version it loaded, and those files must still exist for it to
keep working. The baseline in `frontend_dir` is always retained.

## Future work

Deliberately out of scope, each worth its own issue:

- **Signing.** The MVP trust model is a sha256 on a record that arrived over authenticated sync.
- **Targeting which sites get which bundle.** A real need — canary rollouts, customer-specific
  builds, a reduced UI for multi-device sites — and the same need exists for reports ("show this
  report only to stores with a dispensary"). A single label such as a release channel is too blunt
  for that; the shape is more likely a **selector** evaluated against site and store attributes
  (tags, capabilities, store preferences), and possibly a customer-supplied compatibility check
  shipped as a plugin. That deserves its own design, covering bundles and reports together, so
  **nothing is provisioned for it here** — no column, no wire-format placeholder — rather than
  baking in a shape that presumes the answer. Tracked as a separate action; an approach should be proposed
  before this ships, accepting that adding it may mean a wire-format change.
- **File sync progress and error UI.** Wanted; would serve every synced file, not just bundles.
- **Delta / shared-chunk transfer**, so unchanged vendor code is not re-sent every release.
- **Moving reports and plugins onto the same download queue**, to take their payloads off the normal
  sync path.
- **Rate limiting** central when the whole fleet pulls a new bundle at once.

## Open questions

- **A JSON manifest in the dist, rather than `VERSION.txt`** — the preferred direction, to settle
  before more metadata accretes. Today the server reads the bundle's version by hand-parsing the
  `version:` line out of `VERSION.txt`, which the front-end release workflow writes (and which is
  also served at `/VERSION.txt`, where the login footer reads it). That is fine for one field and
  poor for several, and several are coming: the plugin-API version pair the server-side plugin gate
  needs (below), a compatibility claim the bundle makes about the server rather than one central
  stamps on its behalf, and eventually whatever a bundle would have to declare for per-site
  targeting. A JSON manifest is typed, nests, extends without inventing parsing rules, and matches
  the pin file (`frontend-version.json`) which is already JSON.

  Two constraints on the change: it needs the front-end repo to emit the manifest, and
  `VERSION.txt` has an existing consumer (the login/init footer), so a manifest either supplements
  it or that consumer moves at the same time.
- Does the server-side plugin gate need the dist to declare its `plugin_api_version` /
  `plugin_api_min_supported`? Until it does, only the existing client-side gate is live. Best
  carried by the manifest above rather than by adding lines to `VERSION.txt`.
- Packaging currently discards the dist zip after unpacking (`build/fetch-frontend.js`). Central
  needs the zip to publish it — retain it during packaging, or reconstruct it? (Currently central
  re-zips its own `frontend_dir`, so this is only a question if we want the published sha256 to
  match the front-end release's own sidecar.)
- How many previous versions to retain, and what triggers the cleanup? (Currently two, pruned on
  activation.)
