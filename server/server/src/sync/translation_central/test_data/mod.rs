pub mod item;
pub mod master_list;
pub mod master_list_line;
pub mod master_list_name_join;
pub mod name;
pub mod store;
pub mod unit;

use repository::{
    schema::{
        CentralSyncBufferRow, ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow,
        NameRow, StoreRow, UnitRow,
    },
    ItemRowRepository, MasterListLineRowRepository, MasterListNameJoinRepository,
    MasterListRowRepository, NameRepository, RepositoryError, StorageConnection,
    StoreRowRepository, UnitRowRepository,
};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum TestSyncDataRecord {
    Unit(Option<UnitRow>),
    Item(Option<ItemRow>),
    Store(Option<StoreRow>),
    Name(Option<NameRow>),
    MasterList(Option<MasterListRow>),
    MasterListLine(Option<MasterListLineRow>),
    MasterListNameJoin(Option<MasterListNameJoinRow>),
}
#[allow(dead_code)]
#[derive(Clone)]
pub struct TestSyncRecord {
    /// Expected result for the imported data
    pub translated_record: TestSyncDataRecord,
    /// Identifier for this record
    pub identifier: &'static str,
    /// Row as stored in the central sync buffer
    pub central_sync_buffer_row: CentralSyncBufferRow,
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
pub fn extract_sync_buffer_rows(records: &Vec<TestSyncRecord>) -> Vec<CentralSyncBufferRow> {
    records
        .into_iter()
        .map(|test_record| test_record.central_sync_buffer_row.clone())
        .collect()
}

#[allow(dead_code)]
pub async fn check_records_against_database(
    connection: &StorageConnection,
    records: Vec<TestSyncRecord>,
) {
    for record in records {
        match record.translated_record {
            TestSyncDataRecord::Store(comparison_record) => {
                assert_eq!(
                    StoreRowRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .unwrap(),
                    comparison_record
                )
            }
            TestSyncDataRecord::Name(comparison_record) => {
                assert_eq!(
                    NameRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .unwrap(),
                    comparison_record
                )
            }
            TestSyncDataRecord::Item(comparison_record) => {
                assert_eq!(
                    ItemRowRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .unwrap(),
                    comparison_record
                )
            }
            TestSyncDataRecord::MasterList(comparison_record) => {
                assert_eq!(
                    MasterListRowRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .await,
                    from_option_to_db_result(comparison_record)
                )
            }
            TestSyncDataRecord::MasterListLine(comparison_record) => {
                assert_eq!(
                    MasterListLineRowRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .await,
                    from_option_to_db_result(comparison_record)
                )
            }
            TestSyncDataRecord::MasterListNameJoin(comparison_record) => {
                assert_eq!(
                    MasterListNameJoinRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .await,
                    from_option_to_db_result(comparison_record)
                )
            }
            TestSyncDataRecord::Unit(comparison_record) => {
                assert_eq!(
                    UnitRowRepository::new(&connection)
                        .find_one_by_id(&record.central_sync_buffer_row.record_id)
                        .await,
                    from_option_to_db_result(comparison_record)
                )
            }
        }
    }
}
