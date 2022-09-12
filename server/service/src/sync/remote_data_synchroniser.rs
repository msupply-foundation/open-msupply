use std::time::{Duration, SystemTime};

use super::{
    api::*,
    sync_status::logger::{SyncLogger, SyncLoggerError},
};
use crate::sync::{
    sync_status::logger::SyncStepProgress,
    translations::{translate_changelog, PushRecord},
};
use log::info;
use repository::{
    ChangelogRow, ChangelogRowRepository, KeyValueStoreRepository, KeyValueType, RepositoryError,
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
pub(crate) enum RequestAndSetSiteInfoError {
    #[error("Api error while requesting site info: {0}")]
    RequestSiteInfoError(SyncApiError),
    #[error("Failed to set site info: {0:?}")]
    SetSiteInfoError(RepositoryError),
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

    /// Request site info and persist it
    pub(crate) async fn request_and_set_site_info(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RequestAndSetSiteInfoError> {
        info!("Requesting site info");
        let site_info = self
            .sync_api_v5
            .get_site_info()
            .await
            .map_err(RequestAndSetSiteInfoError::RequestSiteInfoError)?;

        let remote_sync_state = RemoteSyncState::new(&connection);
        remote_sync_state
            .set_site_uuid(site_info.id)
            .map_err(RequestAndSetSiteInfoError::SetSiteInfoError)?;
        remote_sync_state
            .set_site_id(site_info.site_id)
            .map_err(RequestAndSetSiteInfoError::SetSiteInfoError)?;

        info!("Received site info");
        Ok(())
    }

    /// Request initialisation
    pub(crate) fn set_initialised(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), SetInitialisedError> {
        let remote_sync_state = RemoteSyncState::new(&connection);
        // Update push cursor after initial sync, i.e. set it to the end of the just received data
        // so we only push new data to the central server
        let cursor = ChangelogRowRepository::new(connection)
            .latest_changelog()
            .map_err(SetInitialisedError)?
            .map(|row| row.id)
            .unwrap_or(0) as u32;
        remote_sync_state
            .update_push_cursor(cursor + 1)
            .map_err(SetInitialisedError)?;
        remote_sync_state
            .set_initial_remote_data_synced()
            .map_err(SetInitialisedError)?;
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
        let changelog = ChangelogRowRepository::new(connection);

        let state = RemoteSyncState::new(connection);
        loop {
            // TODO inside transaction
            let cursor = state.get_push_cursor().map_err(Error::DatabaseError)?;
            let changelogs = changelog
                .changelogs(cursor as u64, batch_size)
                .map_err(Error::DatabaseError)?;
            let change_logs_total = changelog
                .count(cursor as u64)
                .map_err(Error::DatabaseError)?;

            logger
                .progress(SyncStepProgress::Push, change_logs_total)
                .map_err(Error::SyncLoggerError)?;

            let last_pushed_cursor = changelogs.last().map(|log| log.id);

            let records = translate_changelogs_to_push_records(connection, changelogs)
                .map_err(Error::TranslationError)?;

            let response = self
                .sync_api_v5
                .post_queued_records(change_logs_total, records)
                .await
                .map_err(Error::PushError)?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_pushed_cursor {
                state
                    .update_push_cursor(last_pushed_cursor_id as u32 + 1)
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

// sync_type: SyncTypeV3::Update,
// store_id: record.store_id,
// record_type: record.table_name.to_string(),
// record_id: record.record_id.clone(),
// data: Some(record.data),

// This struct is only for updating values related to sync state, avoid using logic within associated methods
pub struct RemoteSyncState<'a> {
    key_value_store: KeyValueStoreRepository<'a>,
}

impl<'a> RemoteSyncState<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RemoteSyncState {
            key_value_store: KeyValueStoreRepository::new(connection),
        }
    }

    /// Initalisation request was sent and successfull processed
    pub fn sync_queue_initalised(&self) -> Result<bool, RepositoryError> {
        let value = self
            .key_value_store
            .get_bool(KeyValueType::RemoteSyncInitilisationStarted)?;
        Ok(value.unwrap_or(false))
    }

    pub fn set_sync_queue_initialised(&self) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_bool(KeyValueType::RemoteSyncInitilisationStarted, Some(true))
    }

    /// Remote data was initialised
    pub fn initial_remote_data_synced(&self) -> Result<bool, RepositoryError> {
        let value = self
            .key_value_store
            .get_bool(KeyValueType::RemoteSyncInitilisationFinished)?;
        Ok(value.unwrap_or(false))
    }

    // This method should always be coupled with updating of RemoteSyncPushCursor to latest change log + 1
    pub fn set_initial_remote_data_synced(&self) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_bool(KeyValueType::RemoteSyncInitilisationFinished, Some(true))
    }

    pub fn set_site_id(&self, site_id: i32) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_i32(KeyValueType::SettingsSyncSiteId, Some(site_id))
    }

    pub fn set_site_uuid(&self, uuid: String) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_string(KeyValueType::SettingsSyncSiteUuid, Some(uuid))
    }

    pub fn get_push_cursor(&self) -> Result<u32, RepositoryError> {
        let value = self
            .key_value_store
            .get_i32(KeyValueType::RemoteSyncPushCursor)?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u32)
    }

    pub fn update_push_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_i32(KeyValueType::RemoteSyncPushCursor, Some(cursor as i32))
    }
}
