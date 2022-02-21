use repository::{
    schema::RemoteSyncBufferRow, InvoiceRepository, NameStoreJoinRepository, NumberRowRepository,
    RepositoryError, StockLineRowRepository, StorageConnection,
};

use super::{IntegrationRecord, IntegrationUpsertRecord};

pub mod name_store_join;
pub mod number;
pub mod stock_line;
pub mod transact;

#[allow(dead_code)]
#[derive(Clone)]
pub struct TestSyncRecord {
    /// Expected result for the imported data
    pub translated_record: Option<IntegrationRecord>,
    /// Identifier for this record
    pub identifier: &'static str,
    /// Row as stored in the remote sync buffer
    pub remote_sync_buffer_row: RemoteSyncBufferRow,
}

#[allow(dead_code)]
pub struct SyncRecordDefinition {
    pub id: &'static str,
    pub data: &'static str,
    pub identifier: &'static str,
}

// DB query will return NotFound error for record that's not found
// while test data has None for records that shouldn't be integrated
#[allow(dead_code)]
fn from_option_to_db_result<T>(option: Option<T>) -> Result<T, RepositoryError> {
    match option {
        Some(record) => Ok(record),
        None => Err(RepositoryError::NotFound),
    }
}

#[allow(dead_code)]
pub fn extract_sync_buffer_rows(records: &Vec<TestSyncRecord>) -> Vec<RemoteSyncBufferRow> {
    records
        .into_iter()
        .map(|test_record| test_record.remote_sync_buffer_row.clone())
        .collect()
}

#[allow(dead_code)]
pub fn check_records_against_database(
    connection: &StorageConnection,
    records: Vec<TestSyncRecord>,
) {
    for record in records {
        let translated_record = match record.translated_record {
            Some(translated_record) => translated_record,
            None => continue,
        };
        for upsert in translated_record.upserts {
            match upsert {
                IntegrationUpsertRecord::Number(comparison_record) => {
                    assert_eq!(
                        NumberRowRepository::new(&connection)
                            .find_one_by_type_and_store(
                                &comparison_record.r#type,
                                &comparison_record.store_id
                            )
                            .unwrap()
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::StockLine(comparison_record) => {
                    assert_eq!(
                        StockLineRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::NameStoreJoin(comparison_record) => {
                    assert_eq!(
                        NameStoreJoinRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::Shipment(comparison_record) => {
                    assert_eq!(
                        InvoiceRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap(),
                        comparison_record
                    )
                }
            }
        }
    }
}
