# Frontend sync — how the bundle reaches a remote site

- _Date_: 2026-08-03
- _Deciders_: James Brunskill
- _Status_: PROPOSED
- _Outcome_: Option 3 — metadata over normal sync, bytes over file sync

## Context

The new front end lives in its own repo
([open-msupply-frontend](https://github.com/msupply-foundation/open-msupply-frontend)) and is
shipped as a checksum-verified dist zip. This repo records which one it ships in the **pin file**
`frontend-version.json` (tag + sha256); packaging runs `build/fetch-frontend.js` to download,
verify and unpack it into the directory the server serves from (`server.frontend_dir`,
[serve_frontend.rs](../server/server/src/serve_frontend.rs)). On Android the app shell copies the
APK-bundled build into `<filesDir>/frontend` instead
([FrontendAssets.java](../client/packages/android/app/src/main/java/org/openmsupply/client/FrontendAssets.java)).

Today the only way a site gets new front-end code is a new installer or APK. That is slow — a full
release and a per-site upgrade for what may be a one-line UI fix
([#12622](https://github.com/msupply-foundation/open-msupply/issues/12622)). We want to deliver a
new front end the way we already deliver reports and plugins: publish once on central, and let sync
carry it to every compatible site.

This KDD decides **how the bundle's bytes travel**. Which bundle a site is allowed to run is
[Frontend and plugin version compatibility](./2026-08-03_frontend_version_compatibility.md).

### What the reference implementations do

**Reports** are embedded in the server binary (`rust_embed` over `standard_reports/generated`) and
upserted at startup by
[`StandardReports::load_reports`](../server/service/src/standard_reports.rs). Many versions of the
same `code` coexist in the `report` table; the newest compatible one is chosen at query time
([`report_filter_method`](../server/service/src/report/report_service.rs)). Reports sync as ordinary
records.

**Frontend plugins** already do the thing this KDD is weighing up: `frontend_plugin.files` is a JSON
array of `{file_name, file_content_base64}` — the entire JS bundle base64-encoded inside a single
sync record ([frontend_plugin_row.rs](../server/repository/src/db_diesel/frontend_plugin_row.rs)).
The server decodes it on load, keeps the newest compatible version per `code` in an in-memory cache,
sha256s the bytes into a hash token, and serves the files at `/frontend_plugins/{code}/{file}` with
`immutable, max-age=1y`; the client cache-busts with `?v=<hash>`.

**File sync** ([2024-02-28_file_sync.md](./2024-02-28_file_sync.md)) syncs a `sync_file_reference`
row through the normal sync process and moves the bytes out of band over HTTP. Two things about the
current implementation matter here:

- The [`FileSyncDriver`](../server/service/src/sync/file_sync_driver.rs) loop only **uploads**
  (`find_all_to_upload`). There is no background download.
- Downloads are on demand only: a user opening an attachment hits
  `GET /sync_files/{table}/{record}/{file}`, and if the bytes are not on disk the request falls
  through to `FileSynchroniser::download_file_from_central`
  ([static_files.rs](../server/server/src/static_files.rs)). It is a single whole-file GET with no
  range, no resume and no retry schedule — uploads get tus chunking, pause and exponential backoff;
  downloads get none of it.

### Sizes

Measured against the current `open-msupply-frontend` dist (excluding the component showcase, which
is not part of a deployment): **269 files, 3.3 MB on disk, ~945 KB zipped.** The old `client` dist,
for comparison, is 8.5 MB on disk. The new front end is deliberately small, but ~1 MB zipped today
and growing is the number to design against.

### Requirements

1. A remote site can run a newer front end than its installer shipped, without reinstalling.
2. The bundle must survive an APK/installer upgrade sensibly (see the Android clobber, below).
3. A site must only download bundles it can actually run — not every bundle ever published.
4. Transferring a bundle must not block or noticeably degrade normal sync.
5. A partially transferred bundle must never be served.
6. The bytes must be verifiable end to end (we already have a sha256 per dist).
7. Offline-first: once downloaded, a site serves its front end with no connection to central.
8. v7 sites only, open-mSupply central only. No 4D involvement.

## Options

### Option 1 — Base64 the bundle into a normal sync record (the `frontend_plugin` pattern)

Add a `frontend_bundle` table shaped like `frontend_plugin`: the whole dist as a JSON array of
base64 files, or a single base64 zip, in a text column.

_Pros:_

- Zero new infrastructure. The pattern is proven, the sync style is a copy-paste, and it works on
  every transport we already have.
- Atomic by construction: the record either integrates or it doesn't.

_Cons:_

- ~1.3 MB of base64 in one changelog row today (base64 of the zip; base64 of the unpacked files
  would be ~4.4 MB). `batch_size` is a **record count**, not a byte budget, so a batch that happens
  to contain a bundle is one multi-megabyte HTTP body with no resume — on a bad link it retries from
  zero, forever. This is precisely the failure mode
  [the file sync KDD](./2024-02-28_file_sync.md) rejected Option 2 for.
- Every site pays the transfer, including sites that will reject the bundle as incompatible
  (requirement 3) — the record is the payload, so there is no way to see it before receiving it.
- The bytes land in the database. A handful of retained versions is tens of MB of `changelog` and
  table data on every site, and it is all in the backup.
- It gets worse monotonically as the front end grows.

### Option 2 — `sync_file_reference` alone, with no owning record

Publish only a file reference; put the version and compatibility information in `file_name` or in a
convention over `record_id`.

_Pros:_

- Nothing new in the schema at all.

_Cons:_

- `sync_file_reference` is explicitly a *reference* — it carries `table_name` + `record_id` naming
  the record it belongs to, and every consumer assumes that record exists. A dangling reference is a
  new special case in code that currently has none.
- Metadata-in-a-filename is not queryable, not typed, not migratable, and has nowhere to put an
  `is_active` flag or a compatibility range.

### Option 3 — Metadata over normal sync, bytes over file sync (chosen)

A new `frontend_bundle` table syncs as an ordinary record — a few hundred bytes carrying the
version, the compatibility information, the sha256 and an active flag. It owns a
`sync_file_reference` whose bytes are the dist zip, moved by file sync.

The site then decides **locally** whether to download: it compares the bundle record's declared
compatibility against its own app version and only queues the file if it could actually run it. This
is what makes requirement 3 work without central-side targeting — and it has to work that way,
because `changelog` has no `site_id` column and distribution is keyed on store/patient
([changelog filter](../docs/content/docs/sync/changelog-filter/)). `Central` distribution means a
keyless row goes to every site; the *decision* is what's local, not the routing.

_Pros:_

- Sync batches stay small and predictable; the megabytes move on the file-sync path, which already
  pauses while normal sync runs.
- A site sees the compatibility metadata *before* it commits to a download.
- Bytes live in the static file store, not the database or the backup.
- Reuses the existing static-file layout, retry/backoff bookkeeping and status/error columns; a
  progress UI later gets bundles for free alongside every other synced file.

_Cons:_

- Requires a **background download** mechanism, which does not exist yet (see below).
- Two-phase state: a record can exist while its bytes are still in flight, so "is this bundle
  usable?" is a real question the serving path has to answer.
- Whole-file download with no resume is a poor fit for ~1 MB over a bad link — worth fixing as part
  of this work (requirement 4 and the tablet case).

### Option 4 — Central hosts the front end; sites fetch it over HTTP on demand

_Cons:_ breaks offline-first (requirement 7). Rejected for the same reason
[the file sync KDD](./2024-02-28_file_sync.md) rejected its Option 4.

### Option 5 — Each site fetches the dist straight from the B2 mirror / GitHub release

The pin mechanism already knows how to do this, and `fetch-frontend.js` already verifies a sha256.

_Cons:_ requires every remote site to have internet access to a third-party host — many do not, and
sync to central is the only connectivity we can assume. It also puts release distribution outside
the system that already knows which sites exist and what they run.

## Decision

**Option 3 — metadata over normal sync, bytes over file sync.**

Rationale:

- The size trajectory makes Option 1 a slow-motion version of the problem
  [the file sync KDD](./2024-02-28_file_sync.md) already solved: ~1 MB today is survivable, but the
  reason we built file sync was to stop large payloads from riding the sync path at all.
- Only Option 3 lets a site read the compatibility metadata before spending the bandwidth
  (requirement 3).
- The pieces that don't exist yet — background download, resumable download — are things we want
  regardless. Reports and plugins are on the same trajectory, and the same queue would let us move
  them off the sync path later.

Trade-offs accepted:

- We build a background download mechanism now rather than reusing an existing one.
- A bundle record can be present without its bytes; the serving path must treat "downloaded and
  verified" as a distinct state from "known about".

### Sub-decision: how downloads get triggered

Downloads today are user-driven. Rather than special-casing the front end, extend the file-sync
machinery generically:

- A **processor** decides *what* to download and enqueues it — for the front end, "the newest
  compatible bundle this site does not yet hold". Processors already run off sync integration
  ([`processors/`](../server/service/src/processors/)), which is exactly when new bundle records
  arrive, and the `LoadPlugin` processor is the direct precedent.
- The **`FileSyncDriver`** grows a download side alongside its upload side, draining a queue of
  `sync_file_reference` rows marked for download and reusing the existing status / retries /
  `retry_at` / error columns.

This keeps "which files are worth having" (a domain question, per feature) separate from "move the
bytes" (a transport concern, shared). Reports and plugins can register their own predicate later
without touching the driver.

### Sub-decision: publishing on central

Two paths, mirroring how reports work:

- **Bundled with central** — the normal path. Central publishes the dist that its own packaging
  pinned and verified, on startup, the way `StandardReports::load_reports` upserts embedded reports.
  Note `fetch-frontend.js` currently deletes the zip after unpacking, so packaging must retain it
  (or the sha256-verified bytes) for central to publish. Upgrading central is therefore what
  releases a new front end to the fleet.
- **Manual upload** — an admin uploads a dist zip on central, the way plugins are installed today
  (`install_uploaded_plugin`). This is the hotfix path and the "customer-specific build" path.

## Consequences

- **New table** `frontend_bundle`, a new sync style (Central authoring, Central distribution, v7
  only), a translator and a migration. Exact columns are settled in the
  [compatibility KDD](./2026-08-03_frontend_version_compatibility.md) and the
  [spec](../server/spec/sync/frontend-sync.md).
- **`FileSyncDriver` gains a download path**, and downloads should become resumable (HTTP range or
  the tus-style approach uploads already use). A ~1 MB restart-from-zero loop on a poor link is a
  realistic way for this feature to silently never work.
- **The Android clobber is a hard constraint.** `FrontendAssets.sync()` deletes
  `<filesDir>/frontend` and re-copies from the APK whenever the app version changes. A synced bundle
  stored there would be destroyed by every APK upgrade. Synced bundles must unpack somewhere else
  (under `base_dir`), with `frontend_dir` remaining the installer-shipped baseline and the fallback.
- **Verification before activation.** The record carries the sha256; the downloaded zip is verified
  against it before unpacking, and a bundle is only activated after a complete, verified unpack —
  stage-then-swap, which is already the pattern in both `fetch-frontend.js` and `FrontendAssets`.
- **Retention interacts with in-flight clients.** Assets are served `immutable, max-age=1y` with
  content-hashed filenames, so an open tab holding old URLs keeps working *only if the old version's
  files are still on disk. Deleting the previous version immediately is what turns a swap into a
  broken tab. See the spec for the retention rule.
- **Storage.** Each retained version is the zip plus ~3.3 MB unpacked. On a tablet this is small but
  not free; retention must be bounded.
- **Not in scope, deliberately** (each worth its own issue):
  - Signing. sha256 from a record that arrived over authenticated sync is the MVP trust model; a
    real signature over the bundle is a follow-up, and we already have cert/signature machinery from
    the old plugin system ([manifest.rs](../server/service/src/plugin/manifest.rs)) to build on.
  - Rate limiting / staggering the fleet. File sync already yields to normal sync, which should be
    enough at current sizes.
  - A file-sync progress and error UI. Wanted, but a follow-up.
  - Delta or shared-chunk transfer (not re-sending unchanged vendor code).
  - Targeting which bundle a site receives. Every site gets every bundle record and narrows it
    locally by compatibility alone. The eventual shape is likely a selector over site/store
    attributes rather than a release-channel label, so the compatibility KDD deliberately
    provisions nothing for it.
