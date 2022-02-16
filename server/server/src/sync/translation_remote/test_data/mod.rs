use repository::{
    schema::{NumberRow, RemoteSyncBufferRow},
    NumberRowRepository, RepositoryError, StorageConnection,
};

pub mod number;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum TestSyncDataRecord {
    Number(Option<NumberRow>),
}

#[allow(dead_code)]
#[derive(Clone)]
pub struct TestSyncRecord {
    /// Expected result for the imported data
    pub translated_record: TestSyncDataRecord,
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
pub async fn check_records_against_database(
    connection: &StorageConnection,
    records: Vec<TestSyncRecord>,
) {
    for record in records {
        match record.translated_record {
            TestSyncDataRecord::Number(comparison_record) => {
                let comparison_record = match comparison_record {
                    Some(comparison_record) => comparison_record,
                    None => return,
                };
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
        }
    }
}
