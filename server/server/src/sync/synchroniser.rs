use crate::{
    settings::SyncSettings,
    sync::{
        sync_api_v5::{CentralSyncBatchV5, RemoteSyncBatchV5},
        translation::{import_sync_records, SyncImportError, TRANSLATION_RECORDS},
        SyncApiV5, SyncConnectionError,
    },
};
use repository::{
    schema::{CentralSyncBufferRow, KeyValueType},
    CentralSyncBufferRepository, KeyValueStoreRepository, NameStoreJoinRepository, RepositoryError,
    StorageConnection, StorageConnectionManager, TransactionError,
};

use log::info;
use reqwest::{Client, Url};
use thiserror::Error;

use super::{
    sync_api_v5::{CentralSyncRecordV5, RemoteSyncRecordV5},
    SyncCredentials,
};

#[derive(Error, Debug)]
pub enum CentralSyncError {
    #[error("Failed to pull central sync records")]
    PullCentralSyncRecordsError { source: SyncConnectionError },
    #[error("Failed to update central sync buffer records")]
    UpdateCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to get central sync cursor record")]
    GetCentralSyncCursorRecordError { source: RepositoryError },
    #[error("Failed to get central sync buffer records")]
    GetCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to import central sync buffer records")]
    ImportCentralSyncRecordsError { source: SyncImportError },
    #[error("Failed to remove central sync buffer records")]
    RemoveCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to connect to DB")]
    DBConnectionError { source: RepositoryError },
}

#[derive(Error, Debug)]
#[error("{msg}")]
pub struct RemoteSyncError {
    msg: &'static str,
    source: anyhow::Error,
}

#[derive(Error, Debug)]
pub enum SyncError {
    #[error("Failed to sync central records")]
    CentralSyncError {
        #[from]
        source: CentralSyncError,
    },
    #[error("Failed to sync remote records")]
    RemoteSyncError {
        #[from]
        source: RemoteSyncError,
    },
}

pub struct Synchroniser {
    sync_api_v5: SyncApiV5,
}

#[allow(unused_assignments)]
impl Synchroniser {
    pub fn new(settings: &SyncSettings) -> anyhow::Result<Self> {
        let client = Client::new();
        let url = Url::parse(&settings.url)?;
        let credentials = SyncCredentials::new(&settings.username, &settings.password);
        Ok(Synchroniser {
            sync_api_v5: SyncApiV5::new(url, credentials, client),
        })
    }

    async fn pull_central_records(
        &mut self,
        connection_manager: &StorageConnectionManager,
    ) -> Result<(), CentralSyncError> {
        let connection = connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;
        let central_sync_cursor = CentralSyncPullCursor::new(&connection);

        let mut cursor: u32 = central_sync_cursor.get_cursor().await.unwrap_or_else(|_| {
            info!("Initialising new central sync cursor...");
            0
        });

        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        Ok(loop {
            info!("Pulling {} central sync records...", BATCH_SIZE);
            let sync_batch: CentralSyncBatchV5 = self
                .sync_api_v5
                .get_central_records(cursor, BATCH_SIZE)
                .await
                .map_err(|source| CentralSyncError::PullCentralSyncRecordsError { source })?;
            let central_sync_records = central_sync_batch_records_to_buffer_rows(sync_batch.data)
                .map_err(|err| {
                CentralSyncError::PullCentralSyncRecordsError { source: err.into() }
            })?;

            if central_sync_records.len() == 0 {
                info!("Central sync buffer is up-to-date");
                break;
            }

            info!(
                "Inserting {} central sync records into central sync buffer",
                central_sync_records.len()
            );

            for central_sync_record in central_sync_records {
                Synchroniser::insert_one_and_update_cursor(&connection, &central_sync_record)
                    .await
                    .map_err(
                        |source| CentralSyncError::UpdateCentralSyncBufferRecordsError { source },
                    )?;
            }
            info!("Successfully inserted central sync records into central sync buffer");

            cursor = central_sync_cursor
                .get_cursor()
                .await
                .map_err(|source| CentralSyncError::GetCentralSyncCursorRecordError { source })?;

            if cursor >= sync_batch.max_cursor - 1 {
                info!("All central sync records pulled successfully");
                break;
            }
        })
    }

    /// insert row and update cursor in a single transaction
    async fn insert_one_and_update_cursor(
        connection: &StorageConnection,
        central_sync_buffer_row: &CentralSyncBufferRow,
    ) -> Result<(), RepositoryError> {
        let cursor = central_sync_buffer_row.id as u32;
        // note: if already in a transaction this creates a safepoint:
        let result: Result<(), TransactionError<RepositoryError>> = connection
            .transaction(|con| async move {
                CentralSyncBufferRepository::new(con)
                    .insert_one(central_sync_buffer_row)
                    .await?;
                CentralSyncPullCursor::new(con)
                    .update_cursor(cursor)
                    .await?;
                Ok(())
            })
            .await;
        Ok(result?)
    }

    // Hacky method for pulling from sync_queue.
    pub async fn pull_remote_records(
        &mut self,
    ) -> Result<Vec<RemoteSyncRecordV5>, RemoteSyncError> {
        // TODO: only initialize on initial sync.
        info!("Initialising remote sync records...");
        let mut sync_batch: RemoteSyncBatchV5 =
            self.sync_api_v5
                .post_initialise()
                .await
                .map_err(|source| RemoteSyncError {
                    msg: "Failed to initialise remote sync records",
                    source: anyhow::Error::from(source),
                })?;
        info!("Initialised remote sync recordse");

        let mut records: Vec<RemoteSyncRecordV5> = Vec::new();
        while sync_batch.queue_length > 0 {
            info!("Pulling {} remote sync records...", sync_batch.queue_length);
            sync_batch = self
                .sync_api_v5
                .get_queued_records()
                .await
                .map_err(|source| RemoteSyncError {
                    msg: "Failed to pull remote sync records",
                    source: anyhow::Error::from(source),
                })?;
            info!("Pulled {} remote sync records", sync_batch.queue_length);

            // TODO: acknowledge after integration.
            if let Some(data) = sync_batch.data {
                records.append(&mut data.clone());
                info!("Acknowledging remote sync records...");
                self.sync_api_v5
                    .post_acknowledge_records(&records)
                    .await
                    .map_err(|source| RemoteSyncError {
                        msg: "Failed to acknowledge remote sync records",
                        source: anyhow::Error::from(source),
                    })?;
                info!("Acknowledged remote sync records");
            }
        }

        Ok(records)
    }

    async fn integrate_central_records(
        &self,
        connection_manager: &StorageConnectionManager,
    ) -> Result<(), CentralSyncError> {
        let connection = connection_manager
            .connection()
            .map_err(|source| CentralSyncError::DBConnectionError { source })?;
        let central_sync_buffer_repository = CentralSyncBufferRepository::new(&connection);

        let mut records: Vec<CentralSyncBufferRow> = Vec::new();
        for table_name in TRANSLATION_RECORDS {
            info!("Querying central sync buffer for {} records", table_name);

            let mut buffer_rows = central_sync_buffer_repository
                .get_sync_entries(table_name)
                .await
                .map_err(|source| CentralSyncError::GetCentralSyncBufferRecordsError { source })?;

            info!(
                "Found {} {} records in central sync buffer",
                buffer_rows.len(),
                table_name
            );

            records.append(&mut buffer_rows);
        }

        info!("Importing {} central sync buffer records...", records.len());
        import_sync_records(connection_manager, &records)
            .await
            .map_err(|source| CentralSyncError::ImportCentralSyncRecordsError { source })?;
        info!("Successfully Imported central sync buffer records",);

        // TODO needs to be done for M1 as name_store_joins are not synced yet but are required in API
        // these records should actually sync from server in remote sync
        if records.len() > 0 {
            match NameStoreJoinRepository::new(&connection).m1_add() {
                Ok(_) => {}
                Err(_) => {}
            };
        }

        info!("Clearing central sync buffer");
        central_sync_buffer_repository
            .remove_all()
            .await
            .map_err(|source| CentralSyncError::RemoveCentralSyncBufferRecordsError { source })?;
        info!("Successfully cleared central sync buffer");

        Ok(())
    }

    // fn integrate_remote_records(&self, records: Vec<RemoteSyncRecord>) {
    //     records.iter().for_each(|record| {
    //         info!("Integrated remote sync record {}", record.sync_id);
    //     });
    // }

    /// Sync must not be called concurrently (e.g. sync cursors are fetched/updated without DB tx)
    pub async fn sync(
        &mut self,
        connection_manager: &StorageConnectionManager,
    ) -> Result<(), SyncError> {
        info!("Syncing central records...");
        self.pull_central_records(connection_manager).await?;
        info!("Successfully synced central records");

        info!("Integrating central records...");
        self.integrate_central_records(connection_manager).await?;
        info!("Successfully integrated central records");

        // info!("Syncing remote records...");
        // let remote_records = self.pull_remote_records().await?;
        // info!("Successfully pulled remote records");

        // info!("Integrating remote records...");
        // self.integrate_remote_records(remote_records);
        // info!("Successfully integrated remote records");

        Ok(())
    }
}

fn central_sync_batch_records_to_buffer_rows(
    records: Option<Vec<CentralSyncRecordV5>>,
) -> Result<Vec<CentralSyncBufferRow>, serde_json::Error> {
    let central_sync_records: Result<Vec<CentralSyncBufferRow>, serde_json::Error> = records
        .unwrap_or(vec![])
        .into_iter()
        .map(|record| {
            Ok(CentralSyncBufferRow {
                id: record.id,
                table_name: record.table_name,
                record_id: record.record_id,
                data: serde_json::to_string(&record.data)?,
            })
        })
        .collect();
    central_sync_records
}

struct CentralSyncPullCursor<'a> {
    key_value_store: KeyValueStoreRepository<'a>,
}

impl<'a> CentralSyncPullCursor<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CentralSyncPullCursor {
            key_value_store: KeyValueStoreRepository::new(connection),
        }
    }

    pub async fn get_cursor(&self) -> Result<u32, RepositoryError> {
        let value = self
            .key_value_store
            .get_string(KeyValueType::CentralSyncPullCursor)?;
        let cursor = value
            .and_then(|value| value.parse::<u32>().ok())
            .unwrap_or(0);
        Ok(cursor)
    }

    pub async fn update_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        self.key_value_store.set_string(
            KeyValueType::CentralSyncPullCursor,
            Some(format!("{}", cursor)),
        )
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        sync::{
            translation::test_data::{
                check_records_against_database, extract_sync_buffer_rows,
                item::get_test_item_records, master_list::get_test_master_list_records,
                master_list_line::get_test_master_list_line_records,
                master_list_name_join::get_test_master_list_name_join_records,
                name::get_test_name_records, store::get_test_store_records,
            },
            Synchroniser,
        },
        test_utils::get_test_settings,
    };
    use repository::{
        get_storage_connection_manager, schema::CentralSyncBufferRow, test_db,
        CentralSyncBufferRepository,
    };

    #[actix_rt::test]
    async fn test_integrate_central_records() {
        let settings = get_test_settings("omsupply-database-integrate_central_records");

        test_db::setup(&settings.database).await;
        let connection_manager = get_storage_connection_manager(&settings.database);

        // use test records with cursors that are out of order
        let mut test_records = Vec::new();
        test_records.append(&mut get_test_name_records());
        test_records.append(&mut get_test_item_records());
        test_records.append(&mut get_test_store_records());
        test_records.append(&mut get_test_master_list_records());
        test_records.append(&mut get_test_master_list_name_join_records());
        test_records.append(&mut get_test_master_list_line_records());

        let central_records: Vec<CentralSyncBufferRow> = extract_sync_buffer_rows(&test_records);
        let connection = connection_manager.connection().unwrap();
        let central_sync_buffer_repository = CentralSyncBufferRepository::new(&connection);

        central_sync_buffer_repository
            .insert_many(&central_records)
            .expect("Failed to insert central sync records into sync buffer");

        let synchroniser = Synchroniser::new(&settings.sync).unwrap();
        synchroniser
            .integrate_central_records(&connection_manager)
            .await
            .expect("Failed to integrate central records");

        check_records_against_database(&connection_manager, test_records).await;
    }
}
