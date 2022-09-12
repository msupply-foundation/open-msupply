use super::{
    api::{ParsingV5RecordError, SyncApiError, SyncApiV5},
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
};
use crate::sync::api::CentralSyncBatchV5;
use repository::{
    KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection, SyncBufferRow,
    SyncBufferRowRepository,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum CentralSyncError {
    #[error("Api error while pulling central records: {0}")]
    PullError(SyncApiError),
    #[error("Failed to save sync buffer or cursor {0:?}")]
    SaveSyncBufferOrCursorsError(RepositoryError),
    #[error("{0}")]
    ParsingV5RecordError(ParsingV5RecordError),
    #[error("{0}")]
    SyncLoggerError(SyncLoggerError),
}

pub(crate) struct CentralDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl CentralDataSynchroniser {
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), CentralSyncError> {
        use CentralSyncError::*;

        // TODO protection fron infinite loop
        loop {
            let mut cursor = CentralSyncPullCursor::new(&connection)
                .get_cursor()
                .unwrap_or(0);

            let CentralSyncBatchV5 { max_cursor, data } = self
                .sync_api_v5
                .get_central_records(cursor, batch_size)
                .await
                .map_err(PullError)?;

            let batch_length = data.len();

            logger
                .progress(SyncStepProgress::PullCentral, (max_cursor - cursor) as u64)
                .map_err(SyncLoggerError)?;

            for sync_record in data {
                cursor = sync_record.id.clone();
                let buffer_row = sync_record
                    .record
                    .to_buffer_row()
                    .map_err(ParsingV5RecordError)?;

                insert_one_and_update_cursor(connection, &buffer_row, cursor)
                    .map_err(SaveSyncBufferOrCursorsError)?;
            }

            logger
                .progress(SyncStepProgress::PullCentral, (max_cursor - cursor) as u64)
                .map_err(SyncLoggerError)?;

            if batch_length == 0 {
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
