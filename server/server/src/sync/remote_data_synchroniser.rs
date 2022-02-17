use log::info;
use repository::{
    schema::{KeyValueType, RemoteSyncBufferAction, RemoteSyncBufferRow},
    KeyValueStoreRepository, RemoteSyncBufferRepository, RepositoryError, StorageConnection,
};
use thiserror::Error;

use super::{
    sync_api_v5::{RemoteSyncActionV5, RemoteSyncRecordV5},
    SyncApiV5,
};

#[derive(Error, Debug)]
#[error("{msg}")]
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
}

#[allow(unused_assignments)]
impl RemoteDataSynchroniser {
    /// Performs the initial remote data sync (pull) from the central server
    pub async fn initial_pull(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), RemoteSyncError> {
        let state = RemoteSyncState::new(connection);
        if state.initial_remote_data_synced()? {
            return Ok(());
        }

        if !state.sync_queue_initalised()? {
            info!("Initialising remote sync records...");
            let _ = self
                .sync_api_v5
                .post_initialise()
                .await
                .map_err(|error| RemoteSyncError {
                    msg: "Failed to post sync queue initialisation request to the central server",
                    source: anyhow::Error::from(error),
                })?;
            state.set_sync_queue_initalised()?;
            info!("Initialised remote sync records");
        }

        info!("Pull remote records...");
        self.pull_and_store_remote_records(connection)
            .await
            .map_err(|error| RemoteSyncError {
                msg: "Failed to pull remote records",
                source: error,
            })?;
        info!("Successfully pulled remote records");

        // TODO:
        //info!("Integrate remote records...");
        //info!("Successfully integrate remote records");

        state.set_initial_remote_data_synced()?;

        Ok(())
    }

    /// Initalises the sync queue on the central server, pulls all records and stores them in the
    /// DB.
    pub async fn pull_and_store_remote_records(
        &self,
        connection: &StorageConnection,
    ) -> anyhow::Result<()> {
        loop {
            info!("Pulling remote sync records...");
            let sync_batch = self.sync_api_v5.get_queued_records().await?;
            info!(
                "Pulled remote sync records ({} remaining)",
                sync_batch.queue_length
            );

            if let Some(data) = sync_batch.data {
                let sync_ids: Vec<String> =
                    data.iter().map(|record| record.sync_id.clone()).collect();

                let _ = RemoteSyncBufferRepository::new(connection)
                    .upsert_many(&remote_sync_batch_records_to_buffer_rows(&data)?);

                info!("Acknowledging remote sync records...");
                self.sync_api_v5.post_acknowledge_records(sync_ids).await?;
                info!("Acknowledged remote sync records");
            }

            if sync_batch.queue_length <= 0 {
                break;
            }
        }

        Ok(())
    }
}

fn to_row_action(action: &RemoteSyncActionV5) -> RemoteSyncBufferAction {
    match action {
        RemoteSyncActionV5::Create => RemoteSyncBufferAction::Create,
        RemoteSyncActionV5::Update => RemoteSyncBufferAction::Update,
        RemoteSyncActionV5::Delete => RemoteSyncBufferAction::Delete,
        RemoteSyncActionV5::Merge => RemoteSyncBufferAction::Merge,
    }
}

fn remote_sync_batch_records_to_buffer_rows(
    records: &Vec<RemoteSyncRecordV5>,
) -> Result<Vec<RemoteSyncBufferRow>, serde_json::Error> {
    let remote_sync_records: Result<Vec<RemoteSyncBufferRow>, serde_json::Error> = records
        .into_iter()
        .map(|record| {
            Ok(RemoteSyncBufferRow {
                id: record.sync_id.clone(),
                table_name: record.table.clone(),
                record_id: record.record_id.clone(),
                action: to_row_action(&record.action),
                data: serde_json::to_string(&record.data)?,
            })
        })
        .collect();
    remote_sync_records
}

struct RemoteSyncState<'a> {
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

    pub fn set_initial_remote_data_synced(&self) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_bool(KeyValueType::RemoteSyncInitilisationFinished, Some(true))
    }
}
