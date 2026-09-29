pub mod invoice_line;
pub mod store;
pub mod sync_file_reference;
pub mod temperature_log;

use repository::{migrations::Version, RepositoryError, StorageConnection};

use crate::sync_v7::sync::SyncRecordV7;

/// What outgoing translations know about a batch being sent.
pub struct SendContext<'a> {
    pub connection: &'a StorageConnection,
    /// The receiving site's version, when central sends to a remote. `None` when a
    /// remote pushes to central, which is always at least as new.
    pub receiver_version: Option<&'a Version>,
}

/// Outgoing counterpart of `serde::deserialize`'s special cases: shapes a record
/// for the site receiving it. May leave it out or add others; `SyncBatchV7::generate`
/// tops the batch back up.
pub(crate) fn translate_outgoing(
    _context: &SendContext,
    record: SyncRecordV7,
) -> Result<Vec<SyncRecordV7>, RepositoryError> {
    Ok(vec![record])
}
