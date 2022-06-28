use log::info;
use repository::{
    ChangelogRow, ChangelogRowRepository, KeyValueStoreRepository, KeyValueType,
    RemoteSyncBufferAction, RemoteSyncBufferRepository, RemoteSyncBufferRow, RepositoryError,
    StorageConnection,
};
use thiserror::Error;

use crate::sync::{
    sync_api_v3::{RemotePostRecordV3, SyncTypeV3},
    translation_remote::{
        pull::import_sync_pull_records,
        push::{translate_changelog, PushRecord},
        REMOTE_TRANSLATION_RECORDS,
    },
};

use super::{
    sync_api_v3::SyncApiV3,
    sync_api_v5::{RemoteSyncActionV5, RemoteSyncRecordV5},
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
            self.sync_api_v5
                .post_initialise()
                .await
                .map_err(|error| RemoteSyncError {
                    msg: "Failed to post sync queue initialisation request to the central server",
                    source: anyhow::Error::from(error),
                })?;
            state.set_sync_queue_initalised()?;
            info!("Initialised remote sync records");
        }

        self.pull(connection).await?;
        RemoteDataSynchroniser::integrate_records(connection).await?;

        // Update push cursor after initial sync, i.e. set it to the end of the just received data
        // so we only push new data to the central server
        let cursor = ChangelogRowRepository::new(connection)
            .latest_changelog()?
            .map(|row| row.id)
            .unwrap_or(0) as u32;
        state.update_push_cursor(cursor + 1)?;

        state.set_site_id(self.site_id as i32)?;
        state.set_initial_remote_data_synced()?;
        Ok(())
    }

    /// Pull all records from the central server
    pub async fn pull(&self, connection: &StorageConnection) -> Result<(), RemoteSyncError> {
        info!("Pull remote records...");
        self.pull_records(connection)
            .await
            .map_err(|error| RemoteSyncError {
                msg: "Failed to pull remote records",
                source: error,
            })?;
        info!("Successfully pulled remote records");

        Ok(())
    }

    /// Integrate previously pulled records
    pub async fn integrate_records(connection: &StorageConnection) -> Result<(), RemoteSyncError> {
        info!("Integrate remote records...");
        RemoteDataSynchroniser::do_integrate_records(connection).map_err(|error| {
            RemoteSyncError {
                msg: "Failed to integrate remote records",
                source: error,
            }
        })?;
        info!("Successfully integrate remote records");

        Ok(())
    }

    /// Pulls all records and stores them in the RemoteSyncBufferRepository
    async fn pull_records(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Arbitrary batch size TODO: should come from settings
        const BATCH_SIZE: u32 = 500;

        loop {
            info!("Pulling remote sync records...");
            let sync_batch = self.sync_api_v5.get_queued_records(BATCH_SIZE).await?;
            let number_of_pulled_records = sync_batch
                .data
                .as_deref()
                .map(|ref it| it.len())
                .unwrap_or(0) as u32;
            let remaining = sync_batch.queue_length - number_of_pulled_records;
            info!(
                "Pulled {} remote sync records ({} remaining)",
                number_of_pulled_records, remaining
            );

            if let Some(data) = sync_batch.data {
                let sync_ids: Vec<String> =
                    data.iter().map(|record| record.sync_id.clone()).collect();

                let _ = RemoteSyncBufferRepository::new(connection)
                    .upsert_many(&remote_sync_batch_records_to_buffer_rows(data)?);

                info!("Acknowledging remote sync records...");
                self.sync_api_v5.post_acknowledge_records(sync_ids).await?;
                info!("Acknowledged remote sync records");
            }

            if remaining <= 0 {
                break;
            }
        }

        Ok(())
    }

    pub fn do_integrate_records(connection: &StorageConnection) -> anyhow::Result<()> {
        let remote_sync_buffer_repository = RemoteSyncBufferRepository::new(&connection);

        let mut records: Vec<RemoteSyncBufferRow> = Vec::new();
        for table_name in REMOTE_TRANSLATION_RECORDS {
            info!("Querying remote sync buffer for {} records", table_name);

            let mut buffer_rows = remote_sync_buffer_repository.get_sync_entries(table_name)?;

            info!(
                "Found {} {} records in remote sync buffer",
                buffer_rows.len(),
                table_name
            );

            records.append(&mut buffer_rows);
        }

        info!("Importing {} remote sync buffer records...", records.len());
        import_sync_pull_records(connection, &records)?;
        info!("Successfully Imported remote sync buffer records",);

        info!("Clearing remote sync buffer");
        remote_sync_buffer_repository.remove_all()?;
        info!("Successfully cleared remote sync buffer");

        Ok(())
    }

    // push

    pub async fn push_changes(&self, connection: &StorageConnection) -> Result<(), anyhow::Error> {
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
    fn to_row_action(&self) -> RemoteSyncBufferAction {
        match self {
            RemoteSyncActionV5::Create => RemoteSyncBufferAction::Create,
            RemoteSyncActionV5::Update => RemoteSyncBufferAction::Update,
            RemoteSyncActionV5::Delete => RemoteSyncBufferAction::Delete,
            RemoteSyncActionV5::Merge => RemoteSyncBufferAction::Merge,
        }
    }
}

pub fn remote_sync_batch_records_to_buffer_rows(
    records: Vec<RemoteSyncRecordV5>,
) -> Result<Vec<RemoteSyncBufferRow>, serde_json::Error> {
    let remote_sync_records: Result<Vec<RemoteSyncBufferRow>, serde_json::Error> = records
        .into_iter()
        .map(|record| {
            Ok(RemoteSyncBufferRow {
                id: record.sync_id,
                table_name: record.table,
                record_id: record.record_id,
                action: record.action.to_row_action(),
                data: serde_json::to_string(&record.data)?,
            })
        })
        .collect();
    remote_sync_records
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

#[cfg(test)]
mod tests {
    use crate::sync::translation_remote::{
        table_name_to_central,
        test_data::{
            check_records_against_database, extract_sync_buffer_rows,
            get_all_remote_pull_test_records, get_all_remote_push_test_records,
        },
    };
    use repository::{mock::MockDataInserts, test_db, RemoteSyncBufferRepository};

    use super::{translate_changelogs_to_push_records, RemoteDataSynchroniser};

    #[actix_rt::test]
    async fn test_integrate_remote_records() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-integrate_remote_records",
            // can't use all mocks because there will b
            MockDataInserts::all(),
        )
        .await;

        // use test records with cursors that are out of order
        let test_records = get_all_remote_pull_test_records();
        let buffer_rows = extract_sync_buffer_rows(&test_records);
        RemoteSyncBufferRepository::new(&connection)
            .upsert_many(&buffer_rows)
            .expect("Failed to insert remote sync records into sync buffer");

        RemoteDataSynchroniser::do_integrate_records(&connection)
            .expect("Failed to integrate remote records");

        check_records_against_database(&connection, test_records);

        // test push
        let test_records = get_all_remote_push_test_records();
        for record in test_records {
            let expected_row_id = record.change_log.row_id.to_string();
            let expected_table_name = table_name_to_central(&record.change_log.table_name);
            let mut result =
                translate_changelogs_to_push_records(&connection, vec![record.change_log]).unwrap();
            // we currently only have one entry in the data_list
            let result = result.pop().unwrap();
            // tests only do upsert right now, so there must be Some data:
            let data = result.data.unwrap();

            assert_eq!(result.record_id, expected_row_id);
            assert_eq!(result.record_type, expected_table_name);
            assert_eq!(data, record.push_data);
        }
    }
}
