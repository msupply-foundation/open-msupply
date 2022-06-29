use crate::sync::{
    sync_api_v5::CentralSyncBatchV5,
    translation_central::{import_sync_records, TRANSLATION_RECORDS},
    SyncApiV5, SyncConnectionError,
};
use chrono::Utc;
use log::info;
use repository::{
    EqualFilter, KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection,
    SyncBufferAction, SyncBufferFilter, SyncBufferRepository, SyncBufferRow,
    SyncBufferRowRepository,
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

impl CentralSyncRecordV5 {
    pub fn to_sync_buffer(&self) -> Result<SyncBufferRow, serde_json::Error> {
        let result = SyncBufferRow {
            table_name: self.table_name.clone(),
            record_id: self.record_id.clone(),
            data: serde_json::to_string(&self.data)?,
            received_datetime: Utc::now().naive_utc(),
            integration_datetime: None,
            integration_error: None,
            action: SyncBufferAction::Upsert,
        };

        Ok(result)
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
        let cursor: u32 = central_sync_cursor.get_cursor().unwrap_or_else(|_| {
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

            let batch_length = sync_batch.data.len();
            info!(
                "Inserting {} central sync records into central sync buffer",
                batch_length
            );

            for sync_record in sync_batch.data {
                let buffer_row = sync_record.to_sync_buffer().map_err(|e| {
                    CentralSyncError::PullCentralSyncRecordsError { source: e.into() }
                })?;
                Self::insert_one_and_update_cursor(connection, &buffer_row, sync_record.id)
                    .map_err(
                        |source| CentralSyncError::UpdateCentralSyncBufferRecordsError { source },
                    )?;
            }

            if batch_length == 0 {
                info!("Central sync buffer is up-to-date");
                break;
            }
        }
        Ok(())
    }

    /// insert row and update cursor in a single transaction
    pub fn insert_one_and_update_cursor(
        connection: &StorageConnection,
        row: &SyncBufferRow,
        cursor: u32,
    ) -> Result<(), RepositoryError> {
        // note: if already in a transaction this creates a safepoint:
        connection
            .transaction_sync(|con| {
                SyncBufferRowRepository::new(con).upsert_one(row)?;
                CentralSyncPullCursor::new(con).update_cursor(cursor)
            })
            .map_err(|e| e.to_inner_error())
    }

    pub async fn integrate_central_records(
        connection: &StorageConnection,
    ) -> Result<(), CentralSyncError> {
        let mut records: Vec<SyncBufferRow> = Vec::new();
        for table_name in TRANSLATION_RECORDS {
            info!(
                "Querying central sync buffer for \"{}\" records",
                table_name
            );

            let mut buffer_rows = SyncBufferRepository::new(&connection)
                .query_by_filter(
                    SyncBufferFilter::new().table_name(EqualFilter::equal_to(table_name)),
                )
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
        SyncBufferRowRepository::new(&connection)
            .remove_all()
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
    use repository::{mock::MockDataInserts, test_db, SyncBufferRow, SyncBufferRowRepository};

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

        let central_records: Vec<SyncBufferRow> = extract_sync_buffer_rows(&test_records);

        SyncBufferRowRepository::new(&connection)
            .upsert_many(&central_records)
            .expect("Failed to insert central sync records into sync buffer");

        CentralDataSynchroniser::integrate_central_records(&connection)
            .await
            .expect("Failed to integrate central records");

        check_records_against_database(&connection, test_records).await;
    }
}
