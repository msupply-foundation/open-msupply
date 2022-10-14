use std::time::{Duration, SystemTime};

use crate::sync::{
    get_active_records_on_site_filter, sync_status::logger::SyncStepProgress,
    GetActiveStoresOnSiteError,
};

use super::{
    api::*,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{translate_changelogs_to_push_records, PushTranslationError},
};

use log::info;
use repository::{
    ChangelogRepository, KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection,
    SyncBufferRowRepository,
};

use thiserror::Error;

#[derive(Error, Debug)]
#[error(transparent)]
pub(crate) struct PostInitialisationError(#[from] pub(crate) SyncApiError);
#[derive(Error, Debug)]
pub(crate) enum RemotePullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer rows")]
    SaveSyncBufferError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingV5RecordError(#[from] ParsingV5RecordError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

#[derive(Error, Debug)]
pub(crate) enum RemotePushError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    PushTranslationError(#[from] PushTranslationError),
    #[error("Total remaining sent to server is 0 but integration not started")]
    IntegrationNotStarted,
    #[error("Problem getting active stores on site during remote push")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
    #[error(transparent)]
    SyncLoggerError(#[from] SyncLoggerError),
}

#[derive(Error, Debug)]
pub(crate) enum WaitForIntegrationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Integration timeout was reached")]
    IntegrationTimeoutReached,
}

pub struct RemoteDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl RemoteDataSynchroniser {
    /// Request initialisation
    pub(crate) async fn request_initialisation(&self) -> Result<(), PostInitialisationError> {
        self.sync_api_v5.post_initialise().await?;

        Ok(())
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        let cursor = ChangelogRepository::new(connection).latest_cursor()?;

        update_push_cursor(connection, cursor + 1)?;
        Ok(())
    }

    /// Pull all records from the central server
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePullError> {
        let step_progress = SyncStepProgress::PullRemote;
        let sync_buffer_repository = SyncBufferRowRepository::new(connection);

        loop {
            let sync_batch = self.sync_api_v5.get_queued_records(batch_size).await?;

            // queued_length is number of remote pull records awaiting acknowledgement
            // at this point it's number of records waiting to be pulled including records in this pull batch
            let remaining = sync_batch.queue_length;
            let sync_ids = sync_batch.extract_sync_ids();
            let sync_buffer_rows = sync_batch.to_sync_buffer_rows()?;

            let number_of_pulled_records = sync_buffer_rows.len() as u64;

            logger.progress(step_progress.clone(), remaining)?;

            if number_of_pulled_records > 0 {
                sync_buffer_repository.upsert_many(&sync_buffer_rows)?;

                self.sync_api_v5.post_acknowledged_records(sync_ids).await?;
            } else {
                break;
            }

            logger.progress(step_progress.clone(), remaining - number_of_pulled_records)?;
        }

        Ok(())
    }

    // Push all records in change log to central server
    pub(crate) async fn push<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePushError> {
        let changelog_repo = ChangelogRepository::new(connection);
        let change_log_filter = get_active_records_on_site_filter(connection)?;

        loop {
            // TODO inside transaction
            let cursor = get_push_cursor(connection)?;
            let changelogs =
                changelog_repo.changelogs(cursor, batch_size, change_log_filter.clone())?;
            let change_logs_total = changelog_repo.count(cursor, change_log_filter.clone())?;

            logger.progress(SyncStepProgress::Push, change_logs_total)?;

            let last_pushed_cursor = changelogs.last().map(|log| log.cursor);

            let records = translate_changelogs_to_push_records(connection, changelogs)?;

            let response = self
                .sync_api_v5
                .post_queued_records(change_logs_total, records)
                .await?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                update_push_cursor(connection, last_pushed_cursor_id as u64 + 1)?;
            };

            match (response.integration_started, change_logs_total) {
                (true, 0) => break,
                (false, 0) => return Err(RemotePushError::IntegrationNotStarted),
                _ => continue,
            };
        }

        Ok(())
    }

    // Await integration
    pub(crate) async fn wait_for_integration(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), WaitForIntegrationError> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);
        info!("Awaiting central server integration...");
        loop {
            tokio::time::sleep(poll_period).await;

            let response = self.sync_api_v5.get_site_status().await?;

            if response.code == SiteStatusCodeV5::Idle {
                info!("Central server integration finished");
                break;
            }

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(WaitForIntegrationError::IntegrationTimeoutReached);
            }
        }

        Ok(())
    }
}

pub(crate) fn get_push_cursor(connection: &StorageConnection) -> Result<u64, RepositoryError> {
    let value =
        KeyValueStoreRepository::new(connection).get_i32(KeyValueType::RemoteSyncPushCursor)?;
    let cursor = value.unwrap_or(0);
    Ok(cursor as u64)
}

fn update_push_cursor(connection: &StorageConnection, cursor: u64) -> Result<(), RepositoryError> {
    KeyValueStoreRepository::new(connection)
        .set_i32(KeyValueType::RemoteSyncPushCursor, Some(cursor as i32))
}
