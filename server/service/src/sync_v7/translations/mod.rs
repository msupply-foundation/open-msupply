pub mod invoice_line;
pub mod requisition_line;
pub mod store;
pub mod sync_file_reference;
pub mod temperature_log;

use repository::{migrations::Version, syncv7::SyncError, ChangelogRow, Row, StorageConnection};

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
/// the typed row and may leave it out or add others; `SyncBatchV7::generate` tops
/// the batch back up.
pub(crate) fn translate_outgoing(
    context: &SendContext,
    changelog: &ChangelogRow,
    row: Row,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    match row {
        // Special cases go here by row type, each calling its table's module
        Row::RequisitionLine(line) if receiver_needs_legacy_forecast(context.receiver_version) => {
            translate_outgoing_requisition_line(context.connection, changelog, line)
        }

        // Test only: lets `SyncBatchV7`'s tests leave records out and add others
        #[cfg(test)]
        Row::Unit(unit) if unit.id.starts_with("left_out") => Ok(vec![]),
        #[cfg(test)]
        Row::Unit(unit)
            if unit.id.starts_with("remote_only") && context.receiver_version.is_none() =>
        {
            Ok(vec![])
        }
        #[cfg(test)]
        Row::Unit(unit) if unit.id.starts_with("doubled") => {
            let record = SyncRecordV7::upsert(changelog, serialize(&Row::Unit(unit))?);
            let copy = SyncRecordV7 {
                record_id: format!("{}_copy", record.record_id),
                ..record.clone()
            };
            Ok(vec![record, copy])
        }

        // Basic
        row => Ok(vec![SyncRecordV7::upsert(changelog, serialize(&row)?)]),
    }
}

/// `translate_outgoing` for a deleted record, which has no row.
pub(crate) fn translate_outgoing_delete(
    _context: &SendContext,
    changelog: &ChangelogRow,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    Ok(vec![SyncRecordV7::delete(changelog)])
}
