use repository::{syncv7::SyncError, RowActionType, RowOrDelete};

use super::serde::serialize;
use crate::sync_v7::sync::SyncRecordV7;

pub(crate) fn prepare(row_or_delete: RowOrDelete) -> Result<SyncRecordV7, SyncError> {
    match row_or_delete {
        RowOrDelete::Row { changelog, row } => {
            let data = serialize(&row)?;
            Ok(SyncRecordV7 {
                cursor: changelog.cursor,
                record_id: changelog.record_id,
                table_name: changelog.table_name,
                action: RowActionType::Upsert,
                data,
                store_id: changelog.store_id,
                transfer_store_id: changelog.transfer_store_id,
                patient_id: changelog.patient_id,
            })
        }
        RowOrDelete::Delete { changelog } => Ok(SyncRecordV7 {
            cursor: changelog.cursor,
            record_id: changelog.record_id,
            table_name: changelog.table_name,
            action: RowActionType::Delete,
            data: serde_json::Value::Null,
            store_id: changelog.store_id,
            transfer_store_id: changelog.transfer_store_id,
            patient_id: changelog.patient_id,
        }),
    }
}
