pub mod invoice_line;
pub mod store;
pub mod sync_file_reference;
pub mod temperature_log;

use repository::{migrations::Version, syncv7::SyncError, RowOrDelete, StorageConnection};

use crate::sync_v7::{serde::serialize, sync::SyncRecordV7};

/// What outgoing translations know about a batch being sent.
pub struct SendContext<'a> {
    pub connection: &'a StorageConnection,
    /// The receiving site's version, when central sends to a remote. `None` when a
    /// remote pushes to central, which is always at least as new.
    pub receiver_version: Option<&'a Version>,
}

/// Outgoing counterpart of `serde::deserialize`'s special cases: the records a
/// changelog row is sent as, shaped for the site receiving it. A translation gets
/// the typed row and may leave it out or add others; `SyncBatchV7::generate` tops
/// the batch back up.
pub(crate) fn translate_outgoing(
    _context: &SendContext,
    row_or_delete: RowOrDelete,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    match row_or_delete {
        // Special cases go here by row type, each calling its table's module

        // Basic
        RowOrDelete::Row { changelog, row } => {
            Ok(vec![SyncRecordV7::upsert(changelog, serialize(&row)?)])
        }
        RowOrDelete::Delete { changelog } => Ok(vec![SyncRecordV7::delete(changelog)]),
    }
}
