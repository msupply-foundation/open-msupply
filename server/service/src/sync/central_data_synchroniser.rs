use super::{
    api::{CommonSyncRecord, ParsingSyncRecordError, SyncApiError, SyncApiV5},
    sync_status::logger::{SyncLogger, SyncLoggerError, SyncStepProgress},
};
use crate::{cursor_controller::CursorController, sync::api::CentralSyncBatchV5};
use repository::{KeyType, RepositoryError, StorageConnection, SyncBufferRowRepository};
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

        let cursor_controller = CursorController::new(KeyType::CentralSyncPullCursor);

        loop {
            let start_cursor = cursor_controller.get(connection)?;

            let CentralSyncBatchV5 { max_cursor, data } = self
                .sync_api_v5
                .get_central_records(start_cursor, batch_size)
                .await?;
            let batch_length = data.len();

            logger.progress(SyncStepProgress::PullCentral, max_cursor - start_cursor)?;

            let last_cursor_in_batch = data.last().map(|r| r.cursor).unwrap_or(start_cursor);
            let sync_buffer_rows =
                CommonSyncRecord::to_buffer_rows(data.into_iter().map(|r| r.record).collect())?;

            // Upsert sync buffer rows in a transaction together with cursor update
            connection
                .transaction_sync(|t_con| {
                    SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)?;
                    cursor_controller.update(t_con, last_cursor_in_batch)
                })
                .map_err(|e| e.to_inner_error())?;

            logger.progress(
                SyncStepProgress::PullCentral,
                max_cursor - last_cursor_in_batch,
            )?;

            match (batch_length, last_cursor_in_batch < max_cursor) {
                (0, false) => break,
                // It's possible for batch_length in response to be zero even though we haven't reached max_cursor
                // in this case we should increment cursor manually
                (0, true) => cursor_controller.update(connection, last_cursor_in_batch + 1)?,
                _ => continue,
            }
        }
        Ok(())
    }
}
