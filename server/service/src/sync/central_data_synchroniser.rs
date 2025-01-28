use super::{
    api::{ParsingSyncRecordError, SyncApiError, SyncApiV5},
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
};
use crate::{cursor_controller::CursorController, sync::api::CentralSyncBatchV5};
use repository::{
    KeyValueType, RepositoryError, StorageConnection, SyncBufferRow, SyncBufferRowRepository,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub(crate) enum CentralPullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer or cursor")]
    SaveSyncBufferOrCursorsError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
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
        // TODO protection from infinite loop

        let cursor_controller = CursorController::new(KeyValueType::CentralSyncPullCursor);

        loop {
            let mut cursor = cursor_controller.get(&connection)?;

            let CentralSyncBatchV5 { max_cursor, data } = self
                .sync_api_v5
                .get_central_records(cursor, batch_size)
                .await?;
            let batch_length = data.len();

            logger.progress(SyncStepProgress::PullCentral, max_cursor - cursor)?;

            for sync_record in data {
                cursor = sync_record.cursor.clone();
                let buffer_row = sync_record.record.to_buffer_row(None)?;

                insert_one_and_update_cursor(connection, &cursor_controller, &buffer_row, cursor)?;
            }

            logger.progress(SyncStepProgress::PullCentral, max_cursor - cursor)?;

            match (batch_length, cursor < max_cursor) {
                (0, false) => break,
                // It's possible for batch_length in response to be zero even though we haven't reached max_cursor
                // in this case we should increment cursor manually
                (0, true) => cursor_controller.update(&connection, cursor + 1)?,
                _ => continue,
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
            cursor_controller.update(con, cursor)
        })
        .map_err(|e| e.to_inner_error())
}
