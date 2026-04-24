use repository::{syncv7::SyncError, ChangelogRow, StorageConnection};

use super::serde::serialize;
use crate::sync_v7::sync::SyncRecordV7;

pub(crate) fn prepare(
    connection: &StorageConnection,
    changelog: ChangelogRow,
) -> Result<SyncRecordV7, SyncError> {
    let Some(data) = serialize(connection, &changelog.table_name, &changelog.record_id)? else {
        return Err(SyncError::RecordNotFound {
            id: changelog.record_id,
            table: changelog.table_name,
        });
    };

    Ok(SyncRecordV7 {
        cursor: changelog.cursor,
        record_id: changelog.record_id,
        table_name: changelog.table_name,
        action: changelog.row_action,
        data,
        store_id: changelog.store_id,
        transfer_store_id: changelog.transfer_store_id,
        patient_id: changelog.patient_id,
    })
}
