use crate::{
    cursor_controller::CursorController,
    sync::{
        api_v6::{SyncBatchV6, SyncRecordV6},
        sync_status::logger::SyncStepProgress,
    },
};

use super::{
    api::ParsingSyncRecordError,
    api_v6::{SyncApiErrorV6, SyncApiV6},
    sync_status::logger::{SyncLogger, SyncLoggerError},
};

use repository::{
    KeyValueType, RepositoryError, StorageConnection, SyncBufferRow, SyncBufferRowRepository,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum CentralPullErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Failed to save sync buffer or cursor")]
    SaveSyncBufferOrCursorsError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

#[derive(Error, Debug)]
#[error("Failed to serialise V6 remote record into sync buffer row, record: '{record:?}'")]
pub(crate) struct SerialisingToSyncBuffer {
    source: serde_json::Error,
    record: serde_json::Value,
}

pub(crate) struct CentralDataSynchroniserV6 {
    pub(crate) sync_api_v6: SyncApiV6,
}

impl CentralDataSynchroniserV6 {
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), CentralPullErrorV6> {
        let cursor_controller = CursorController::new(KeyValueType::SyncPullCursorV6);
        // TODO protection from infinite loop
        loop {
            let cursor = cursor_controller.get(&connection)?;

            let SyncBatchV6 {
                end_cursor,
                total_records,
                records,
            } = self.sync_api_v6.pull(cursor, batch_size).await?;

            logger.progress(SyncStepProgress::PullCentralV6, total_records)?;

            let is_empty = records.is_empty();

            for SyncRecordV6 { cursor, record } in records {
                let buffer_row = record.to_buffer_row()?;

                insert_one_and_update_cursor(
                    connection,
                    &cursor_controller,
                    &buffer_row,
                    cursor as u64,
                )?;
            }

            cursor_controller.update(&connection, end_cursor + 1)?;

            if is_empty && total_records == 0 {
                break;
            }
        }
        Ok(())
    }
}

fn insert_one_and_update_cursor(
    connection: &StorageConnection,
    cursor_controller: &CursorController,
    row: &SyncBufferRow,
    cursor: u64,
) -> Result<(), RepositoryError> {
    connection
        .transaction_sync(|con| {
            SyncBufferRowRepository::new(con).upsert_one(row)?;
            cursor_controller.update(con, cursor + 1)
        })
        .map_err(|e| e.to_inner_error())
}
