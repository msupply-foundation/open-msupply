use chrono::Utc;
use log::info;
use repository::{
    ChangelogRow, ChangelogRowRepository, KeyValueStoreRepository, KeyValueType, RepositoryError,
    StorageConnection, SyncBufferAction, SyncBufferRow, SyncBufferRowRepository,
};
use thiserror::Error;

use crate::sync::{
    sync_api_v3::{RemotePostRecordV3, SyncTypeV3},
    translations::{translate_changelog, PushRecord},
};

use super::{
    sync_api_v3::SyncApiV3,
    sync_api_v5::{RemoteSyncActionV5, RemoteSyncBatchV5},
    SyncApiV5,
};

#[derive(Error, Debug)]
#[error("{msg}: {source}")]
pub struct RemoteSyncError {
    msg: &'static str,
    source: anyhow::Error,
}

impl From<RepositoryError> for RemoteSyncError {
    fn from(err: RepositoryError) -> Self {
        RemoteSyncError {
            msg: "Internal DB error",
            source: anyhow::Error::from(err),
        }
    }
}

pub struct RemoteDataSynchroniser {
    pub sync_api_v5: SyncApiV5,
    pub sync_api_v3: SyncApiV3,
    pub site_id: u32,
    pub central_server_site_id: u32,
}

#[allow(unused_assignments)]
impl RemoteDataSynchroniser {
    /// Request initialisation
    pub async fn request_initialisation(&self) -> Result<(), RemoteSyncError> {
        info!("Initialising remote sync records...");
        self.sync_api_v5
            .post_initialise()
            .await
            .map_err(|error| RemoteSyncError {
                msg: "Failed to post sync queue initialisation request to the central server",
                source: anyhow::Error::from(error),
            })?;

        info!("Initialised remote sync records");

        Ok(())
    }

    /// Request initialisation
    pub fn set_initialised(&self, connection: &StorageConnection) -> Result<(), RepositoryError> {
        let remote_sync_state = RemoteSyncState::new(&connection);
        // Update push cursor after initial sync, i.e. set it to the end of the just received data
        // so we only push new data to the central server
        let cursor = ChangelogRowRepository::new(connection)
            .latest_changelog()?
            .map(|row| row.id)
            .unwrap_or(0) as u32;
        remote_sync_state.update_push_cursor(cursor + 1)?;

        remote_sync_state.set_site_id(self.site_id as i32)?;
        remote_sync_state.set_initial_remote_data_synced()?;
        Ok(())
    }

    /// Pull all records from the central server
    pub(crate) async fn pull(&self, connection: &StorageConnection) -> Result<(), anyhow::Error> {
        // Arbitrary batch size TODO: should come from settings
        const BATCH_SIZE: u32 = 500;
        let sync_buffer_repository = SyncBufferRowRepository::new(connection);

        loop {
            info!("Pulling remote sync records...");

            let sync_batch = self.sync_api_v5.get_queued_records(BATCH_SIZE).await?;

            let total_queue_length = sync_batch.queue_length;
            let sync_ids = sync_batch.extract_sync_ids();
            let sync_buffer_rows = sync_batch.to_sync_buffer_rows()?;

            let number_of_pulled_records = sync_buffer_rows.len() as u32;

            info!(
                "Pulled {} remote sync records ({} remaining)",
                number_of_pulled_records,
                total_queue_length - number_of_pulled_records
            );

            if number_of_pulled_records > 0 {
                sync_buffer_repository.upsert_many(&sync_buffer_rows)?;

                info!("Acknowledging remote sync records...");
                self.sync_api_v5.post_acknowledge_records(sync_ids).await?;
                info!("Acknowledged remote sync records");
            } else {
                break;
            }
        }

        Ok(())
    }

    // Push all records in change log to central server
    pub async fn push(&self, connection: &StorageConnection) -> Result<(), anyhow::Error> {
        let changelog = ChangelogRowRepository::new(connection);

        const BATCH_SIZE: u32 = 1000;
        let state = RemoteSyncState::new(connection);
        loop {
            info!("Remote push: Check changelog...");
            let cursor = state.get_push_cursor()?;
            let changelogs = changelog.changelogs(cursor as u64, BATCH_SIZE)?;
            if changelogs.is_empty() {
                break;
            }
            info!(
                "Remote push: Translate {} changelogs to push records...",
                changelogs.len()
            );
            let last_changelog_id = changelogs.last().map(|log| log.id).unwrap_or(cursor as i64);
            let records = translate_changelogs_to_push_records(connection, changelogs)?;

            self.sync_api_v3
                .post_queued_records(self.site_id, self.central_server_site_id, &records)
                .await?;

            state.update_push_cursor(last_changelog_id as u32 + 1)?;
            info!(
                "Remote push: {} records pushed to central server",
                records.len()
            );
        }

        Ok(())
    }
}

pub fn translate_changelogs_to_push_records(
    connection: &StorageConnection,
    changelogs: Vec<ChangelogRow>,
) -> Result<Vec<RemotePostRecordV3>, anyhow::Error> {
    let mut out_records: Vec<PushRecord> = Vec::new();
    for changelog in changelogs {
        translate_changelog(connection, &changelog, &mut out_records)?;
    }

    info!("Remote push: Send records to central server...");
    let records: Vec<RemotePostRecordV3> = out_records
        .into_iter()
        .map(|record| match record {
            PushRecord::Upsert(record) => RemotePostRecordV3 {
                sync_id: format!("{}", record.sync_id),
                sync_type: SyncTypeV3::Update,
                store_id: record.store_id,
                record_type: record.table_name.to_string(),
                record_id: record.record_id.clone(),
                data: Some(record.data),
            },
            PushRecord::Delete(record) => RemotePostRecordV3 {
                sync_id: format!("{}", record.sync_id),
                sync_type: SyncTypeV3::Delete,
                store_id: None,
                record_type: record.table_name.to_string(),
                record_id: record.record_id.clone(),
                data: None,
            },
        })
        .collect();
    Ok(records)
}

impl RemoteSyncActionV5 {
    fn to_row_action(&self) -> SyncBufferAction {
        match self {
            RemoteSyncActionV5::Create => SyncBufferAction::Upsert,
            RemoteSyncActionV5::Update => SyncBufferAction::Upsert,
            RemoteSyncActionV5::Delete => SyncBufferAction::Delete,
            RemoteSyncActionV5::Merge => SyncBufferAction::Merge,
        }
    }
}

impl RemoteSyncBatchV5 {
    fn extract_sync_ids(&self) -> Vec<String> {
        self.data.iter().map(|r| r.sync_id.clone()).collect()
    }

    fn to_sync_buffer_rows(self) -> Result<Vec<SyncBufferRow>, serde_json::Error> {
        self.data
            .into_iter()
            .map(|record| {
                Ok(SyncBufferRow {
                    table_name: record.table,
                    record_id: record.record_id,
                    action: record.action.to_row_action(),
                    data: serde_json::to_string(&record.data)?,
                    received_datetime: Utc::now().naive_utc(),
                    integration_datetime: None,
                    integration_error: None,
                })
            })
            .collect()
    }
}

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

    pub fn sync_queue_initalised(&self) -> Result<bool, RepositoryError> {
        let value = self
            .key_value_store
            .get_bool(KeyValueType::RemoteSyncInitilisationStarted)?;
        Ok(value.unwrap_or(false))
    }

    pub fn set_sync_queue_initalised(&self) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_bool(KeyValueType::RemoteSyncInitilisationStarted, Some(true))
    }

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
