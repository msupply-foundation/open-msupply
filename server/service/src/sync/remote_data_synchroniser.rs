use std::time::{Duration, SystemTime};

use crate::{
    cursor_controller::CursorController,
    sync::{
        get_sync_push_changelogs_filter, sync_status::logger::SyncStepProgress,
        GetActiveStoresOnSiteError,
    },
};

use super::{
    api::*,
    sync_status::logger::{SyncLogger, SyncLoggerError},
    translations::{
        translate_changelogs_to_sync_records, PushSyncRecord, PushTranslationError,
        ToSyncRecordTranslationType,
    },
};

use log::info;
use repository::{
    ChangelogRepository, KeyType, RepositoryError, StorageConnection, SyncBufferRowRepository,
};

use thiserror::Error;

const INITIALISATION_POLL_PERIOD_SECONDS: u64 = 15;
// 30 minutes
const INITIALISATION_TIMEOUT_SECONDS: u64 = 30 * 60;

#[derive(Error, Debug)]
pub(crate) enum PostInitialisationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Error while waiting for initialisation")]
    WaitForInitialisationError(#[from] WaitForSyncOperationError),
}

#[derive(Error, Debug)]
pub(crate) enum RemotePullError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Failed to save sync buffer rows")]
    SaveSyncBufferError(#[from] RepositoryError),
    #[error(transparent)]
    ParsingRecordError(#[from] ParsingSyncRecordError),
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
pub(crate) enum WaitForSyncOperationError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiError),
    #[error("Timeout was reached")]
    TimeoutReached,
}

pub struct RemoteDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl RemoteDataSynchroniser {
    /// Request initialisation
    /// This api call is blocking, and will wait while central server adds relevant records to sync queue.
    /// If there is a connection problem while initialisation is happening, we don't want to restart initialisation on next sync
    /// thus polling and a check for initialisation status was introduced. When initialisation is in progress,
    /// api will return `initialisation_in_progress` and `get_site_info` will return `initialisationStatus` = `started`
    pub(crate) async fn request_initialisation(&self) -> Result<(), PostInitialisationError> {
        // First check if already initialising
        let initialisation_status = self
            .sync_api_v5
            .get_site_info()
            .await?
            .initialisation_status;
        let should_post_initialise = initialisation_status != InitialisationStatus::Started;

        if should_post_initialise {
            let Err(error) = self.sync_api_v5.post_initialise().await else {
                return Ok(());
            };
            // Ignore connection or unknown error. There is high chance of connection error
            // on post_initialise end point (since it's blocking and can take awhile).
            if !(error.is_connection() || error.is_unknown()) {
                return Err(error.into());
            }
        }
        // Wait for initialisation to finish
        self.wait_for_sync_operation(
            INITIALISATION_POLL_PERIOD_SECONDS,
            INITIALISATION_TIMEOUT_SECONDS,
        )
        .await?;

        Ok(())
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        let cursor = ChangelogRepository::new(connection).latest_cursor()?;

        CursorController::new(KeyType::RemoteSyncPushCursor).update(connection, cursor + 1)?;
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
        let change_log_filter = get_sync_push_changelogs_filter(connection)?;
        let cursor_controller = CursorController::new(KeyType::RemoteSyncPushCursor);

        loop {
            // TODO inside transaction
            let cursor = cursor_controller.get(connection)?;
            let changelogs =
                changelog_repo.changelogs(cursor, batch_size, change_log_filter.clone())?;
            let change_logs_total = changelog_repo.count(cursor, change_log_filter.clone())?;

            logger.progress(SyncStepProgress::Push, change_logs_total)?;

            let last_pushed_cursor = changelogs.last().map(|log| log.cursor);

            let records = translate_changelogs_to_sync_records(
                connection,
                changelogs,
                ToSyncRecordTranslationType::PushToLegacyCentral,
            )?
            .into_iter()
            .map(RemoteSyncRecordV5::from)
            .collect();

            let response = self
                .sync_api_v5
                .post_queued_records(change_logs_total, records)
                .await?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                cursor_controller.update(connection, last_pushed_cursor_id as u64 + 1)?;
            };

            match (response.integration_started, change_logs_total) {
                (true, 0) => break,
                (false, 0) => return Err(RemotePushError::IntegrationNotStarted),
                _ => continue,
            };
        }

        Ok(())
    }

    // Wait for sync operation
    pub(crate) async fn wait_for_sync_operation(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), WaitForSyncOperationError> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);
        info!("Awaiting central server operation...");
        loop {
            tokio::time::sleep(poll_period).await;

            let response = self.sync_api_v5.get_site_status().await?;

            if response.code == SiteStatusCodeV5::Idle {
                info!("Central server operation finished");
                break;
            }

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(WaitForSyncOperationError::TimeoutReached);
            }
        }

        Ok(())
    }
}

impl From<PushSyncRecord> for RemoteSyncRecordV5 {
    fn from(PushSyncRecord { cursor, record }: PushSyncRecord) -> Self {
        RemoteSyncRecordV5 {
            sync_id: cursor.to_string(),
            record,
        }
    }
}
