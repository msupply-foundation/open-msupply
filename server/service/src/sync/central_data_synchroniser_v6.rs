use std::time::{Duration, SystemTime};

use crate::{
    cursor_controller::CursorController,
    sync::{
        api_v6::{SyncBatchV6, SyncRecordV6},
        sync_status::logger::SyncStepProgress,
    },
};

use super::{
    api::{CommonSyncRecord, ParsingSyncRecordError, SyncApiSettings},
    api_v6::{SyncApiErrorV6, SyncApiV6, SyncApiV6CreatingError},
    get_sync_push_changelogs_filter,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{
        translate_changelogs_to_sync_records, PushTranslationError, ToSyncRecordTranslationType,
    },
    GetActiveStoresOnSiteError,
};

use repository::{
    ChangelogRepository, KeyType, RepositoryError, StorageConnection, SyncBufferRowRepository,
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
pub(crate) enum WaitForSyncOperationErrorV6 {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Timeout was reached")]
    TimeoutReached,
}

pub(crate) struct SynchroniserV6 {
    sync_api_v6: SyncApiV6,
}

impl SynchroniserV6 {
    pub(crate) fn new(
        url: &str,
        sync_v5_settings: &SyncApiSettings,
        sync_v6_version: u32,
    ) -> Result<Self, SyncApiV6CreatingError> {
        Ok(Self {
            sync_api_v6: SyncApiV6::new(url, sync_v5_settings, sync_v6_version)?,
        })
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        let cursor = ChangelogRepository::new(connection).latest_cursor()?;

        CursorController::new(KeyType::SyncPushCursorV6).update(connection, cursor + 1)?;
        Ok(())
    }

    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        is_initialised: bool,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), CentralPullErrorV6> {
        let cursor_controller = CursorController::new(KeyType::SyncPullCursorV6);
        // TODO protection from infinite loop
        loop {
            let start_cursor = cursor_controller.get(connection)?;

            let SyncBatchV6 {
                end_cursor,
                total_records,
                is_last_batch,
                records,
            } = self
                .sync_api_v6
                .pull(start_cursor, batch_size, is_initialised)
                .await?;

            logger.progress(SyncStepProgress::PullCentralV6, total_records)?;

            let last_cursor_in_batch = records.last().map(|r| r.cursor).unwrap_or(start_cursor);
            let sync_buffer_rows =
                CommonSyncRecord::to_buffer_rows(records.into_iter().map(|r| r.record).collect())?;
            // Upsert sync buffer rows in a transaction together with cursor update
            connection
                .transaction_sync(|t_con| {
                    SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)?;
                    cursor_controller.update(t_con, last_cursor_in_batch + 1)
                })
                .map_err(|e| e.to_inner_error())?;
            // TODO it's likely that above update to cursor is redundant, this comment is to record this observation in a PR https://github.com/msupply-foundation/open-msupply/pull/4283/files/ac66350bc5aee585a10c2a8450e8d2abeffc527b#r1656344877
            cursor_controller.update(connection, end_cursor + 1)?;

            if is_last_batch {
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
        let cursor_controller = CursorController::new(KeyType::SyncPushCursorV6);

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

            log::info!(
                "Pushing {}/{} records to v6 central server",
                changelogs.len(),
                change_logs_total
            );
            log::debug!("Records: {:#?}", changelogs);

            let records: Vec<SyncRecordV6> = translate_changelogs_to_sync_records(
                connection,
                changelogs,
                ToSyncRecordTranslationType::PushToOmSupplyCentral,
            )?
            .into_iter()
            .map(SyncRecordV6::from)
            .collect();

            let is_last_batch = change_logs_total <= batch_size as u64;

            let batch = SyncBatchV6 {
                total_records: change_logs_total,
                end_cursor: last_pushed_cursor.unwrap_or(0) as u64,
                records,
                is_last_batch,
            };

            self.sync_api_v6.push(batch).await?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                cursor_controller.update(connection, last_pushed_cursor_id as u64 + 1)?;
            };

            // TODO Wait for integration to start??? Or somehow control when/if we should continue to do pull and other actions...
        }

        Ok(())
    }

    pub(crate) async fn wait_for_sync_operation(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), WaitForSyncOperationErrorV6> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);
        log::info!("Awaiting central server operation...");
        loop {
            tokio::time::sleep(poll_period).await;

            let response = self.sync_api_v6.get_site_status().await?;

            if !response.is_integrating {
                log::info!("Central server operation finished");
                break;
            }

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(WaitForSyncOperationErrorV6::TimeoutReached);
            }
        }

        Ok(())
    }
}
