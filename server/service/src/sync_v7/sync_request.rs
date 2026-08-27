// SyncRequest parameterises a single v7 sync run. The main sync becomes one
// SyncRequest; auxiliary sync (e.g. backfilling a record type, re-syncing data
// for a transferred store) is another SyncRequest with its own filter, cursor
// and reference.
//
// `reference_id` is stamped onto every sync_buffer row inserted by this run
// and onto the sync_log_v7 row, and is used to filter pending records during
// integrate. If a run's integrate fails partway, the next run with the same
// reference_id picks up its own leftovers — that's the primary recovery path.
// Removing a reference_id without finishing its integrate orphans rows in
// sync_buffer; sweeping orphans is out of scope for this first cut.

use repository::ChangelogCondition;

use crate::cursor_controller::CursorType;

pub struct SyncRequest {
    pub pull: Option<SyncRequestStep>,
    pub push: Option<SyncRequestStep>,
    pub reference_id: Option<String>,
    /// True only for the bootstrap main sync. Auxiliary requests (those with
    /// a reference_id) must always be false — the central pull filter and the
    /// integration transaction wrapping behave differently when initialising.
    pub is_initialising: bool,
}

pub struct SyncRequestStep {
    pub filter: ChangelogCondition::Inner,
    pub cursor_type: CursorType,
}
