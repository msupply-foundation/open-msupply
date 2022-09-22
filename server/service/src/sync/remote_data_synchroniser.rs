use std::time::{Duration, SystemTime};

use crate::sync::{
    get_active_records_on_site_filter,
    sync_status::logger::SyncStepProgress,
    translations::{translate_changelog, PushRecord},
    GetActiveStoresOnSiteError,
};

use super::{
    api::*,
    sync_status::logger::{SyncLogger, SyncLoggerError},
};

use log::info;
use repository::{
    ChangelogRepository, ChangelogRow, KeyValueStoreRepository, KeyValueType, RepositoryError,
    StorageConnection, SyncBufferRowRepository,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to send initialisation request: {0:?}")]
pub(crate) struct PostInitialisationError(pub(crate) SyncApiError);
#[derive(Error, Debug)]
#[error("Failed to set initialised state: {0:?}")]
pub(crate) struct SetInitialisedError(RepositoryError);
#[derive(Error, Debug)]
pub(crate) enum RemotePullError {
    #[error("Api error while pulling remote records: {0}")]
    PullError(SyncApiError),
    #[error("Failed to acknowledge sync records: {0}")]
    AcknowledgedError(SyncApiError),
    #[error("Failed to save sync buffer rows {0:?}")]
    SaveSyncBufferError(RepositoryError),
    #[error("{0}")]
    ParsingV5RecordError(ParsingV5RecordError),
    #[error("{0}")]
    SyncLoggerError(SyncLoggerError),
}

#[derive(Error, Debug)]
pub(crate) enum RemotePushError {
    #[error("Api error while pushing remote records: {0}")]
    PushError(SyncApiError),
    #[error("Database error while pushing remote records {0:?}")]
    DatabaseError(RepositoryError),
    #[error("Problem translation remote records during push {0:?}")]
    TranslationError(anyhow::Error),
    #[error("Total remaining sent to server is 0 but integration not started")]
    IntegrationNotStarter,
    #[error("Problem getting active stores on site during remote push {0}")]
    GetActiveStoresOnSiteError(GetActiveStoresOnSiteError),
    #[error("{0}")]
    SyncLoggerError(SyncLoggerError),
}

pub struct RemoteDataSynchroniser {
    pub(crate) sync_api_v5: SyncApiV5,
}

impl RemoteDataSynchroniser {
    /// Request initialisation
    pub(crate) async fn request_initialisation(&self) -> Result<(), PostInitialisationError> {
        self.sync_api_v5
            .post_initialise()
            .await
            .map_err(PostInitialisationError)?;

        Ok(())
    }

    /// Update push cursor after initial sync, i.e. set it to the end of the just received data
    /// so we only push new data to the central server
    pub(crate) fn advance_push_cursor(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), SetInitialisedError> {
        let cursor = ChangelogRepository::new(connection)
            .latest_cursor()
            .map_err(SetInitialisedError)?;

        update_push_cursor(connection, cursor + 1).map_err(SetInitialisedError)?;
        Ok(())
    }

    /// Pull all records from the central server
    pub(crate) async fn pull<'a>(
        &self,
        connection: &StorageConnection,
        batch_size: u32,
        logger: &mut SyncLogger<'a>,
    ) -> Result<(), RemotePullError> {
        use RemotePullError::*;
        let step_progress = SyncStepProgress::PullRemote;
        let sync_buffer_repository = SyncBufferRowRepository::new(connection);

        loop {
            let sync_batch = self
                .sync_api_v5
                .get_queued_records(batch_size)
                .await
                .map_err(PullError)?;

            // queued_length is number of remote pull records awaiting acknowledgement
            // at this point it's number of records waiting to be pulled including records in this pull batch
            let remaining = sync_batch.queue_length;
            let sync_ids = sync_batch.extract_sync_ids();
            let sync_buffer_rows = sync_batch
                .to_sync_buffer_rows()
                .map_err(ParsingV5RecordError)?;

            let number_of_pulled_records = sync_buffer_rows.len() as u64;

            logger
                .progress(step_progress.clone(), remaining)
                .map_err(SyncLoggerError)?;

            if number_of_pulled_records > 0 {
                sync_buffer_repository
                    .upsert_many(&sync_buffer_rows)
                    .map_err(SaveSyncBufferError)?;

                self.sync_api_v5
                    .post_acknowledged_records(sync_ids)
                    .await
                    .map_err(AcknowledgedError)?;
            } else {
                break;
            }

            logger
                .progress(step_progress.clone(), remaining - number_of_pulled_records)
                .map_err(SyncLoggerError)?;
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
        use RemotePushError as Error;
        let changelog_repo = ChangelogRepository::new(connection);
        let change_log_filter = get_active_records_on_site_filter(connection)
            .map_err(Error::GetActiveStoresOnSiteError)?;

        loop {
            // TODO inside transaction
            let cursor = get_push_cursor(connection).map_err(Error::DatabaseError)?;
            let changelogs = changelog_repo
                .changelogs(cursor, batch_size, change_log_filter.clone())
                .map_err(Error::DatabaseError)?;
            let change_logs_total = changelog_repo
                .count(cursor, change_log_filter.clone())
                .map_err(Error::DatabaseError)?;

            logger
                .progress(SyncStepProgress::Push, change_logs_total)
                .map_err(Error::SyncLoggerError)?;

            let last_pushed_cursor = changelogs.last().map(|log| log.cursor);

            let records = translate_changelogs_to_push_records(connection, changelogs)
                .map_err(Error::TranslationError)?;

            let response = self
                .sync_api_v5
                .post_queued_records(change_logs_total, records)
                .await
                .map_err(Error::PushError)?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                update_push_cursor(connection, last_pushed_cursor_id as u64 + 1)
                    .map_err(Error::DatabaseError)?;
            };

            match (response.integration_started, change_logs_total) {
                (true, 0) => break,
                (false, 0) => return Err(Error::IntegrationNotStarter),
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
    ) -> Result<(), anyhow::Error> {
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
                return Err(anyhow::anyhow!("Integration timeout reached"));
            }
        }

        Ok(())
    }
}

pub(crate) fn translate_changelogs_to_push_records(
    connection: &StorageConnection,
    changelogs: Vec<ChangelogRow>,
) -> Result<Vec<RemoteSyncRecordV5>, anyhow::Error> {
    let mut out_records: Vec<PushRecord> = Vec::new();
    for changelog in changelogs {
        translate_changelog(connection, &changelog, &mut out_records)?;
    }

    info!("Remote push: Send records to central server...");
    let records: Vec<RemoteSyncRecordV5> = out_records
        .into_iter()
        .map(|record| match record {
            PushRecord::Upsert(record) => RemoteSyncRecordV5 {
                sync_id: record.sync_id.to_string(),
                record: CommonSyncRecordV5 {
                    table_name: record.table_name.to_string(),
                    record_id: record.record_id,
                    action: SyncActionV5::Update,
                    data: record.data,
                },
            },
            PushRecord::Delete(record) => RemoteSyncRecordV5 {
                sync_id: record.sync_id.to_string(),
                record: CommonSyncRecordV5 {
                    table_name: record.table_name.to_string(),
                    record_id: record.record_id,
                    action: SyncActionV5::Delete,
                    data: json!({}),
                },
            },
        })
        .collect();
    Ok(records)
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
