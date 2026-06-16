+++
title = "Sync schema (breaking-change detection)"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Sync schema (breaking-change detection)

The sync API has no formal schema, so it is easy to silently break compatibility with sites
running older builds — for example by renaming a field on the wire. This happened between
v2.16 and v2.17, where a foreign key flipped between `name_id` and `name_link_id` without a
version bump (the `to_link_id_compat_value` shim now works around it).

To catch this class of change, the **sync wire-format contract** is snapshotted to a checked-in
file, `server/sync-schema.json`, and CI fails any PR where the regenerated snapshot no longer
matches the committed one. Every change to the contract therefore surfaces as a reviewable diff.

The snapshot is generated from the live Rust types (`schemars` `JsonSchema` derives) by
`service/src/sync/sync_schema.rs`, and covers three layers:

- **Version window** — `SYNC_V5_VERSION`, `SYNC_V6_VERSION` and the accepted v6 `[MIN, MAX]` range.
- **Envelope / protocol** — the V6 request/response/payload/error types and the V5 records this
  site pushes to legacy mSupply central.
- **Per-record translators** — a JSON Schema for every `SyncTranslation` wire type (`Legacy*`
  structs and the repository `*Row` structs serialised directly), plus a registry manifest of each
  translator's `table_name`(s) and `change_log_type`.

> Coverage note: v6 is covered on both ends; v5 covers only what this site *sends*; v7 is not
> covered yet.

### Regenerating the snapshot

After any change that affects the sync wire format, regenerate and commit the snapshot:

**In development mode**

```
cd server
cargo run --bin remote_server_cli -- export-sync-schema
```

This writes `server/sync-schema.json` (pass `--path <file>` to write elsewhere). The output is
deterministic, so re-running produces an identical file. For full arguments run the command with
`--help`.

**In production**

```
omSupply-cli export-sync-schema
```

### What counts as a breaking change?

This is a drift detector, not an automatic classifier — *any* difference fails the check, and a
reviewer decides whether it is breaking:

- **Breaking**: a renamed or removed wire field / enum-variant string, a changed type, a changed
  `table_name`, a removed translator, or a moved version window.
- **Additive (usually safe, still surfaced)**: a new field (especially `#[serde(default)]`), a new
  translator, or a new enum variant — regenerate and commit, and a reviewer approves it as additive.
- **Not surfaced**: changes that do not alter the wire shape (key order is sorted; a Rust-field
  rename whose `#[serde(rename)]` keeps the wire key).

### CI

The check runs as `.github/workflows/sync-schema-compatibility.yaml` on PRs that touch
`server/service/src/sync/**`: it regenerates the snapshot and diffs it against the committed file,
printing the drift and remediation steps if they differ. The same assertion also runs as the
`sync_schema_snapshot_is_up_to_date` test in the normal server test suite, so it fails fast locally
and in the merge queue too.

If CI fails, regenerate the snapshot as above, review the diff for breaking changes (bumping
`SYNC_V5_VERSION` / `SYNC_V6_VERSION` or `MIN_VERSION` / `MAX_VERSION` if warranted), and commit the
regenerated `server/sync-schema.json`.
