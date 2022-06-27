use crate::sync::{
    sync_api_v5::CentralSyncBatchV5,
    translation_central::{import_sync_records, TRANSLATION_RECORDS},
    SyncApiV5, SyncConnectionError,
};
use log::info;
use repository::{
    CentralSyncBufferRepository, CentralSyncBufferRow, KeyValueStoreRepository, KeyValueType,
    RepositoryError, StorageConnection, TransactionError,
};
use thiserror::Error;

use super::{sync_api_v5::CentralSyncRecordV5, SyncImportError};

#[derive(Error, Debug)]
pub enum CentralSyncError {
    #[error("Failed to pull central sync records - {source:?}")]
    PullCentralSyncRecordsError { source: SyncConnectionError },
    #[error("Failed to update central sync buffer records - {source:?}")]
    UpdateCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to get central sync cursor record - {source:?}")]
    GetCentralSyncCursorRecordError { source: RepositoryError },
    #[error("Failed to get central sync buffer records - {source:?}")]
    GetCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to import central sync buffer records - {source:?}")]
    ImportCentralSyncRecordsError { source: SyncImportError },
    #[error("Failed to remove central sync buffer records - {source:?}")]
    RemoveCentralSyncBufferRecordsError { source: RepositoryError },
    #[error("Failed to connect to DB - {source:?}")]
    DBConnectionError { source: RepositoryError },
}

impl CentralSyncError {
    pub fn from_database_error(e: RepositoryError) -> Self {
        CentralSyncError::DBConnectionError { source: e }
    }
}
pub struct CentralDataSynchroniser {
    pub sync_api_v5: SyncApiV5,
}

impl CentralDataSynchroniser {
    async fn pull_central_records(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), CentralSyncError> {
        let central_sync_cursor = CentralSyncPullCursor::new(&connection);
        let mut cursor: u32 = central_sync_cursor.get_cursor().unwrap_or_else(|_| {
            info!("Initialising new central sync cursor...");
            0
        });

        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        loop {
            info!("Pulling central sync records...");
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
                Self::insert_one_and_update_cursor(&connection, &central_sync_record)
                    .await
                    .map_err(
                        |source| CentralSyncError::UpdateCentralSyncBufferRecordsError { source },
                    )?;
            }
            info!("Successfully inserted central sync records into central sync buffer");

            cursor = central_sync_cursor
                .get_cursor()
                .map_err(|source| CentralSyncError::GetCentralSyncCursorRecordError { source })?;

            if cursor >= sync_batch.max_cursor - 1 {
                info!("All central sync records pulled successfully");
                break;
            }
        }
        Ok(())
    }

    /// insert row and update cursor in a single transaction
    pub async fn insert_one_and_update_cursor(
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
                CentralSyncPullCursor::new(con).update_cursor(cursor)?;
                Ok(())
            })
            .await;
        Ok(result?)
    }

    pub async fn integrate_central_records(
        connection: &StorageConnection,
    ) -> Result<(), CentralSyncError> {
        let central_sync_buffer_repository = CentralSyncBufferRepository::new(&connection);

        let mut records: Vec<CentralSyncBufferRow> = Vec::new();
        for table_name in TRANSLATION_RECORDS {
            info!(
                "Querying central sync buffer for \"{}\" records",
                table_name
            );

            let mut buffer_rows = central_sync_buffer_repository
                .get_sync_entries(table_name)
                .await
                .map_err(|source| CentralSyncError::GetCentralSyncBufferRecordsError { source })?;

            info!(
                "Found {} \"{}\" records in central sync buffer",
                buffer_rows.len(),
                table_name
            );

            records.append(&mut buffer_rows);
        }

        info!("Importing {} central sync buffer records...", records.len());
        import_sync_records(connection, &records)
            .await
            .map_err(|source| CentralSyncError::ImportCentralSyncRecordsError { source })?;
        info!("Successfully Imported central sync buffer records",);

        info!("Clearing central sync buffer");
        central_sync_buffer_repository
            .remove_all()
            .await
            .map_err(|source| CentralSyncError::RemoveCentralSyncBufferRecordsError { source })?;
        info!("Successfully cleared central sync buffer");

        Ok(())
    }

    pub async fn pull_and_integrate_records(
        &self,
        connection: &StorageConnection,
    ) -> Result<(), CentralSyncError> {
        info!("Syncing central records...");
        self.pull_central_records(connection).await?;
        info!("Successfully synced central records");

        info!("Integrating central records...");
        CentralDataSynchroniser::integrate_central_records(connection).await?;
        info!("Successfully integrated central records");

        Ok(())
    }
}

pub fn central_sync_batch_records_to_buffer_rows(
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

    pub fn get_cursor(&self) -> Result<u32, RepositoryError> {
        let value = self
            .key_value_store
            .get_i32(KeyValueType::CentralSyncPullCursor)?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u32)
    }

    pub fn update_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        self.key_value_store
            .set_i32(KeyValueType::CentralSyncPullCursor, Some(cursor as i32))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_central::test_data::{
        check_records_against_database, extract_sync_buffer_rows, item::get_test_item_records,
        master_list::get_test_master_list_records,
        master_list_line::get_test_master_list_line_records,
        master_list_name_join::get_test_master_list_name_join_records, name::get_test_name_records,
        store::get_test_store_records,
    };
    use repository::{test_db, CentralSyncBufferRepository, CentralSyncBufferRow, mock::MockDataInserts};

    use super::CentralDataSynchroniser;

    #[actix_rt::test]
    async fn test_integrate_central_records() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-integrate_central_recordse",
            MockDataInserts::none(),
        )
        .await;

        // use test records with cursors that are out of order
        let mut test_records = Vec::new();
        test_records.append(&mut get_test_name_records());
        test_records.append(&mut get_test_item_records());
        test_records.append(&mut get_test_store_records());
        test_records.append(&mut get_test_master_list_records());
        test_records.append(&mut get_test_master_list_name_join_records());
        test_records.append(&mut get_test_master_list_line_records());

        let central_records: Vec<CentralSyncBufferRow> = extract_sync_buffer_rows(&test_records);

        let central_sync_buffer_repository = CentralSyncBufferRepository::new(&connection);

        central_sync_buffer_repository
            .insert_many(&central_records)
            .expect("Failed to insert central sync records into sync buffer");

        CentralDataSynchroniser::integrate_central_records(&connection)
            .await
            .expect("Failed to integrate central records");

        check_records_against_database(&connection, test_records).await;
    }
}
