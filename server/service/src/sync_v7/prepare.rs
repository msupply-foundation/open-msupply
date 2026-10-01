use repository::{syncv7::SyncError, ChangelogRow, RowActionType, RowOrDelete};

use crate::sync_v7::{
    sync::SyncRecordV7,
    translations::{translate_outgoing, translate_outgoing_delete, SendContext},
};

/// The records sent for one changelog row: usually one, but an outgoing
/// translation may leave it out or add others.
pub(crate) fn prepare(
    context: &SendContext,
    row_or_delete: RowOrDelete,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    match row_or_delete {
        RowOrDelete::Row { changelog, row } => translate_outgoing(context, &changelog, row),
        RowOrDelete::Delete { changelog } => translate_outgoing_delete(context, &changelog),
    }
}

impl SyncRecordV7 {
    /// `changelog`'s record, sent as `data`.
    pub(crate) fn upsert(changelog: &ChangelogRow, data: serde_json::Value) -> Self {
        SyncRecordV7 {
            cursor: changelog.cursor,
            record_id: changelog.record_id.clone(),
            table_name: changelog.table_name.clone(),
            action: RowActionType::Upsert,
            data,
            store_id: changelog.store_id.clone(),
            transfer_store_id: changelog.transfer_store_id.clone(),
            patient_id: changelog.patient_id.clone(),
        }
    }

    /// `changelog`'s record, sent as deleted.
    pub(crate) fn delete(changelog: &ChangelogRow) -> Self {
        SyncRecordV7 {
            cursor: changelog.cursor,
            record_id: changelog.record_id.clone(),
            table_name: changelog.table_name.clone(),
            action: RowActionType::Delete,
            data: serde_json::Value::Null,
            store_id: changelog.store_id.clone(),
            transfer_store_id: changelog.transfer_store_id.clone(),
            patient_id: changelog.patient_id.clone(),
        }
    }
}
