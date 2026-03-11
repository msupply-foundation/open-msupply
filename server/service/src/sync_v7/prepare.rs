use repository::{
    syncv7::SyncError, ChangelogRow, StorageConnection, SyncBufferV7Row, SyncRecordData,
};

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
        record: SyncBufferV7Row {
            data: SyncRecordData(data),
            ..changelog.to_sync_buffer()
        },
    })
}
