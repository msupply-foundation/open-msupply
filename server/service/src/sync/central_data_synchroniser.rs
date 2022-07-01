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
    #[error("Failed to pull central sync records - {0:?}")]
    PullCentralSyncRecordsError(SyncConnectionError),
    #[error("Failed to translate pulled record to sync buffer - {0:?}")]
    PullCentralTranslateToSyncBuffer(serde_json::Error),
    #[error("Failed to update central sync buffer records - {0:?}")]
    UpdateCentralSyncBufferRecordsError(RepositoryError),
}

impl CentralSyncRecordV5 {
    pub(crate) fn to_sync_buffer_row(&self) -> Result<SyncBufferRow, serde_json::Error> {
        let result = SyncBufferRow {
            table_name: self.table_name.clone(),
            record_id: self.record_id.clone(),
            data: serde_json::to_string(&self.data)?,
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
        use CentralSyncError as Error;
        let central_sync_cursor = CentralSyncPullCursor::new(&connection);
        let cursor: u32 = central_sync_cursor.get_cursor().unwrap_or_else(|_| {
            info!("Initialising new central sync cursor...");
            0
        });

        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        loop {
            info!("Pulling central sync records...");
            let sync_batch: CentralSyncBatchV5 = self
                .sync_api_v5
                .get_central_records(cursor, BATCH_SIZE)
                .await
                .map_err(Error::PullCentralSyncRecordsError)?;

            let batch_length = sync_batch.data.len();
            info!(
                "Inserting {} central sync records into central sync buffer",
                batch_length
            );

            for sync_record in sync_batch.data {
                let buffer_row = sync_record
                    .to_sync_buffer_row()
                    .map_err(Error::PullCentralTranslateToSyncBuffer)?;
                insert_one_and_update_cursor(connection, &buffer_row, sync_record.id)
                    .map_err(Error::UpdateCentralSyncBufferRecordsError)?;
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
    // note: if already in a transaction this creates a safepoint:
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
