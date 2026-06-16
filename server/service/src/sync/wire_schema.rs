//! Snapshot of the open-mSupply **sync wire-format contract**, used to detect breaking changes
//! to the sync API in CI.
//!
//! The sync API has two layers that can break compatibility:
//!  - the **envelope / protocol** types below (V5 records this site pushes to legacy mSupply
//!    central, and the V6 request/response/payload types exchanged with open-mSupply central), and
//!  - the **version window** this build sends and accepts.
//!
//! [`sync_wire_schema`] serialises both into a single deterministic JSON document. The document is
//! checked in at `server/sync-wire-schema.json` and regenerated via
//! `cargo run --bin remote_server_cli -- export-sync-schema`. A drift between the generated value
//! and the committed file (see [`tests::wire_schema_snapshot_is_up_to_date`] and
//! `.github/workflows/sync-schema-compatibility.yaml`) means the wire format changed — which must
//! be reviewed as a potential breaking change and, where relevant, paired with a version bump.
//!
//! This is the v6-envelope-first slice. The per-record translator schemas
//! (`translations/*.rs` `Legacy*`/`*Row` structs) are the intended next expansion: derive
//! `JsonSchema` on them and add them as fields of [`SyncWireContract`].

use schemars::schema_for;
use serde_json::{json, Value};

use super::{
    api::{
        CommonSyncRecord, ParsedError, RemoteSyncBatchV5, RemoteSyncRecordV5, SyncAction,
        SyncApiSettings,
    },
    api_v6::{
        SiteStatusRequestV6, SiteStatusResponseV6, SiteStatusV6, SyncBatchV6,
        SyncDownloadFileRequestV6, SyncParsedErrorV6, SyncPatientPullRequestV6, SyncPullRequestV6,
        SyncPullResponseV6, SyncPushRequestV6, SyncPushResponseV6, SyncPushSuccessV6, SyncRecordV6,
        SyncUploadFileRequestV6, SyncUploadFileResponseV6,
    },
    settings::{SYNC_V5_VERSION, SYNC_V6_VERSION},
    sync_on_central::supported_sync_v6_version_range,
};

/// Aggregates every type that appears on the sync wire so a single `schema_for!` call captures the
/// whole contract, with shared types de-duplicated into `definitions`. Mirrors the `PluginTypes`
/// pattern used for ts-rs exports. The fields are never read — the struct exists only to drive
/// schema generation, so every field name maps to a wire type for readability of the snapshot.
#[derive(schemars::JsonSchema)]
#[allow(dead_code)]
struct SyncWireContract {
    // --- Record envelope shared by the V5 and V6 protocols ---
    common_sync_record: CommonSyncRecord,
    sync_action: SyncAction,
    sync_api_settings: SyncApiSettings,

    // --- V5: what this site sends to / parses from the legacy mSupply central server ---
    remote_sync_batch_v5: RemoteSyncBatchV5,
    remote_sync_record_v5: RemoteSyncRecordV5,
    parsed_error_v5: ParsedError,

    // --- V6 requests (open-mSupply remote -> open-mSupply central) ---
    sync_pull_request_v6: SyncPullRequestV6,
    sync_push_request_v6: SyncPushRequestV6,
    sync_patient_pull_request_v6: SyncPatientPullRequestV6,
    site_status_request_v6: SiteStatusRequestV6,
    sync_download_file_request_v6: SyncDownloadFileRequestV6,
    sync_upload_file_request_v6: SyncUploadFileRequestV6,

    // --- V6 responses ---
    sync_pull_response_v6: SyncPullResponseV6,
    sync_push_response_v6: SyncPushResponseV6,
    site_status_response_v6: SiteStatusResponseV6,
    sync_upload_file_response_v6: SyncUploadFileResponseV6,

    // --- V6 payloads / errors ---
    sync_batch_v6: SyncBatchV6,
    sync_record_v6: SyncRecordV6,
    sync_push_success_v6: SyncPushSuccessV6,
    site_status_v6: SiteStatusV6,
    sync_parsed_error_v6: SyncParsedErrorV6,
}

/// Build the sync wire-format contract snapshot as a JSON value.
pub fn sync_wire_schema() -> Value {
    let (sync_v6_accepted_min, sync_v6_accepted_max) = supported_sync_v6_version_range();

    json!({
        "$comment": concat!(
            "GENERATED FILE - do not edit by hand. Snapshot of the open-mSupply sync wire-format ",
            "contract, used to detect breaking sync API changes in CI. Regenerate with ",
            "`cargo run --bin remote_server_cli -- export-sync-schema`. See ",
            ".github/workflows/sync-schema-compatibility.yaml and service/src/sync/wire_schema.rs."
        ),
        "versions": {
            "sync_v5_version_sent": SYNC_V5_VERSION,
            "sync_v6_version_sent": SYNC_V6_VERSION,
            "sync_v6_accepted_min": sync_v6_accepted_min,
            "sync_v6_accepted_max": sync_v6_accepted_max,
        },
        "contract": schema_for!(SyncWireContract),
    })
}

/// Pretty-printed, newline-terminated form of [`sync_wire_schema`]. `serde_json::Value` orders
/// object keys via a `BTreeMap`, so the output is deterministic and stable for git diffing.
pub fn sync_wire_schema_string() -> String {
    let mut out =
        serde_json::to_string_pretty(&sync_wire_schema()).expect("sync wire schema must serialise");
    out.push('\n');
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The committed snapshot (`server/sync-wire-schema.json`) must match what the code generates.
    /// `include_str!` is resolved relative to this file: `server/service/src/sync/` + `../../../`
    /// = `server/`. Drift means the sync wire format changed — regenerate and review for breaking
    /// changes before committing.
    #[test]
    fn wire_schema_snapshot_is_up_to_date() {
        let committed = include_str!("../../../sync-wire-schema.json");
        let generated = sync_wire_schema_string();
        pretty_assertions::assert_eq!(
            committed,
            generated,
            "sync wire-format contract drifted from the committed snapshot. Regenerate with: \
             cargo run --bin remote_server_cli -- export-sync-schema"
        );
    }
}
