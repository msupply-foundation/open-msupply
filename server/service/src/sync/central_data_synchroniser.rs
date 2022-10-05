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
pub(crate) enum CentralPullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer or cursor")]
    SaveSyncBufferOrCursorsError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingV5RecordError(#[from] ParsingV5RecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
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
    ) -> Result<(), CentralPullError> {
        // TODO protection fron infinite loop
        loop {
            let mut cursor = CentralSyncPullCursor::new(&connection)
                .get_cursor()
                .unwrap_or(0);

            let CentralSyncBatchV5 { max_cursor, data } = self
                .sync_api_v5
                .get_central_records(cursor, batch_size)
                .await?;
            let batch_length = data.len();

            logger.progress(SyncStepProgress::PullCentral, max_cursor - cursor)?;

            for sync_record in data {
                cursor = sync_record.cursor.clone();
                let buffer_row = sync_record.record.to_buffer_row()?;

                insert_one_and_update_cursor(connection, &buffer_row, cursor)?;
            }

            logger.progress(SyncStepProgress::PullCentral, max_cursor - cursor)?;

            match (batch_length, cursor < max_cursor) {
                (0, false) => break,
                // It's possible for batch_length in response to be zero even though we haven't reached max_cursor
                // in this case we should increment cursor manually
                (0, true) => CentralSyncPullCursor::new(connection).update_cursor(cursor + 1)?,
                _ => continue,
            }
        }
        Ok(())
    }
}

fn insert_one_and_update_cursor(
    connection: &StorageConnection,
    row: &SyncBufferRow,
    cursor: u64,
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

    pub fn get_cursor(&self) -> Result<u64, RepositoryError> {
        let value = self
            .key_value_store
            .get_i32(KeyValueType::CentralSyncPullCursor)?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u64)
    }

    pub fn update_cursor(&self, cursor: u64) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_i32(KeyValueType::CentralSyncPullCursor, Some(cursor as i32))
    }
}
