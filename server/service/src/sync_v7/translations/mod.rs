pub mod invoice_line;
pub mod name;
pub mod requisition_line;
pub mod store;
pub mod sync_file_reference;
pub mod temperature_log;

use repository::{Row, RowOrDelete, StorageConnection, migrations::Version, syncv7::SyncError};

use crate::sync_v7::{serde::serialize, sync::SyncRecordV7};
use requisition_line::{receiver_needs_legacy_forecast, translate_outgoing_requisition_line};

/// What outgoing translations know about a batch being sent.
pub struct SendContext<'a> {
    pub connection: &'a StorageConnection,
    /// The receiving site's version, when central sends to a remote. `None` when a
    /// remote pushes to central, which is always at least as new.
    pub receiver_version: Option<&'a Version>,
}

/// Outgoing counterpart of `serde::deserialize`'s special cases: the records a
/// changelog row is sent as, shaped for the site receiving it. A translation gets
/// the typed row, or the delete, and may leave it out or add others;
/// `SyncBatchV7::generate` tops the batch back up.
pub(crate) fn translate_outgoing(
    context: &SendContext,
    row_or_delete: RowOrDelete,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    match row_or_delete {
        // Special cases go here by row type, each calling its table's module
        RowOrDelete::Row {
            changelog,
            row: Row::RequisitionLine(line),
        } if receiver_needs_legacy_forecast(context.receiver_version) => {
            translate_outgoing_requisition_line(context.connection, changelog, line)
        }

        // Basic
        RowOrDelete::Row { changelog, row } => {
            Ok(vec![SyncRecordV7::upsert(changelog, serialize(&row)?)])
        }
        RowOrDelete::Delete { changelog } => Ok(vec![SyncRecordV7::delete(changelog)]),
    }
}
