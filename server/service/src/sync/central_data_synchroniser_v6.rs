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
    get_sync_push_changelogs_filter,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{
        translate_changelogs_to_sync_records, PushTranslationError, ToSyncRecordTranslationType,
    },
    GetActiveStoresOnSiteError,
};

use log::debug;
use repository::{
    ChangelogRepository, KeyValueType, RepositoryError, StorageConnection, SyncBufferRow,
    SyncBufferRowRepository,
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
pub(crate) enum RemotePushErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    PushTranslationError(#[from] PushTranslationError),
    #[error("Problem getting active stores on site during remote push")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
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

    // Push all (relevant) records in change log to open-mSupply central server
    pub(crate) async fn push<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePushErrorV6> {
        let changelog_repo = ChangelogRepository::new(connection);
        let change_log_filter = get_sync_push_changelogs_filter(connection)?;
        let cursor_controller = CursorController::new(KeyValueType::SyncPushCursorV6);

        loop {
            // TODO inside transaction
            let cursor = cursor_controller.get(connection)?;
            let changelogs =
                changelog_repo.changelogs(cursor, batch_size, change_log_filter.clone())?;
            let change_logs_total = changelog_repo.count(cursor, change_log_filter.clone())?;

            logger.progress(SyncStepProgress::PushCentralV6, change_logs_total)?;

            if change_logs_total == 0 {
                break; // Nothing more to do, break out of the loop
            };

            let last_pushed_cursor = changelogs.last().map(|log| log.cursor);

            let records = translate_changelogs_to_sync_records(
                connection,
                changelogs,
                ToSyncRecordTranslationType::PushToOmSupplyCentral,
            )?
            .into_iter()
            .map(SyncRecordV6::from)
            .collect();

            let batch = SyncBatchV6 {
                total_records: change_logs_total,
                end_cursor: last_pushed_cursor.unwrap_or(0) as u64,
                records,
            };

            let response = self.sync_api_v6.push(batch).await?;
            debug!("V6 Push response: {:#?}", response);

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                cursor_controller.update(connection, last_pushed_cursor_id as u64 + 1)?;
            };

            // TODO Wait for integration to start??? Or somehow control when/if we should continue to do pull and other actions...
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
