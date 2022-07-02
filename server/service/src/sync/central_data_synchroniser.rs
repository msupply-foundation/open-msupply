use crate::sync::{sync_api_v5::CentralSyncBatchV5, SyncApiV5, SyncConnectionError};
use chrono::Utc;
use log::info;
use repository::{
    KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection, SyncBufferAction,
    SyncBufferRow, SyncBufferRowRepository,
};
use thiserror::Error;

use super::sync_api_v5::CentralSyncRecordV5;

#[derive(Error, Debug)]
pub(crate) enum CentralSyncError {
    #[error("Api error while pulling remote records: {0:?}")]
    PullError(SyncConnectionError),
    #[error("Failed to save sync buffer or cursor {0:?}")]
    SaveSyncBufferOrCursorsError(RepositoryError),
    #[error("Failed to save sync buffer or cursor {0:?}")]
    ParsingV5RecordError(ParsingV5RecordError),
}

#[derive(Error, Debug)]
#[error("{source:?} {record:?}")]
pub(crate) struct ParsingV5RecordError {
    source: serde_json::Error,
    record: serde_json::Value,
}
impl CentralSyncRecordV5 {
    pub(crate) fn to_sync_buffer_row(self) -> Result<SyncBufferRow, ParsingV5RecordError> {
        let data = self.data;
        let result = SyncBufferRow {
            table_name: self.table_name,
            record_id: self.record_id,
            data: serde_json::to_string(&data).map_err(|e| ParsingV5RecordError {
                source: e,
                record: data.clone(),
            })?,
            received_datetime: Utc::now().naive_utc(),
            integration_datetime: None,
            integration_error: None,
            action: SyncBufferAction::Upsert,
        };

        Ok(result)
    }
}
pub(crate) struct CentralDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl CentralDataSynchroniser {
    pub(crate) async fn pull(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), CentralSyncError> {
        let cursor: u32 = CentralSyncPullCursor::new(&connection)
            .get_cursor()
            .unwrap_or(0);

        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        loop {
            info!("Pulling central sync records...");
            let sync_batch: CentralSyncBatchV5 = self
                .sync_api_v5
                .get_central_records(cursor, BATCH_SIZE)
                .await
                .map_err(CentralSyncError::PullError)?;

            let batch_length = sync_batch.data.len();
            info!(
                "Inserting {} central sync records into central sync buffer",
                batch_length
            );

            for sync_record in sync_batch.data {
                let cursor = sync_record.id.clone();
                let buffer_row = sync_record
                    .to_sync_buffer_row()
                    .map_err(CentralSyncError::ParsingV5RecordError)?;

                insert_one_and_update_cursor(connection, &buffer_row, cursor)
                    .map_err(CentralSyncError::SaveSyncBufferOrCursorsError)?;
            }

            if batch_length == 0 {
                info!("Central sync buffer is up-to-date");
                break;
            }
        }
        Ok(())
    }
}

fn insert_one_and_update_cursor(
    connection: &StorageConnection,
    row: &SyncBufferRow,
    cursor: u32,
) -> Result<(), RepositoryError> {
    connection
        .transaction_sync(|con| {
            SyncBufferRowRepository::new(con).upsert_one(row)?;
            CentralSyncPullCursor::new(con).update_cursor(cursor)
        })
        .map_err(|e| e.to_inner_error())
}

struct CentralSyncPullCursor<'a> {
    key_value_store: KeyValueStoreRepository<'a>,
}

impl<'a> CentralSyncPullCursor<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CentralSyncPullCursor {
            key_value_store: KeyValueStoreRepository::new(connection),
        }
    }

    pub fn get_cursor(&self) -> Result<u32, RepositoryError> {
        let value = self
            .key_value_store
            .get_i32(KeyValueType::CentralSyncPullCursor)?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u32)
    }

    pub fn update_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_i32(KeyValueType::CentralSyncPullCursor, Some(cursor as i32))
    }
}
