use repository::{
    schema::{ChangelogRow, RemoteSyncBufferRow},
    InvoiceLineRowRepository, InvoiceRepository, LocationRowRepository, NameStoreJoinRepository,
    NumberRowRepository, RepositoryError, RequisitionLineRowRepository, RequisitionRowRepository,
    StockLineRowRepository, StocktakeLineRowRepository, StocktakeRowRepository, StorageConnection,
};

use self::{
    location::{get_test_location_records, get_test_push_location_records},
    number::{get_test_number_records, get_test_push_number_records},
    requisition::{get_test_push_requisition_records, get_test_requisition_records},
    requisition_line::{get_test_push_requisition_line_records, get_test_requisition_line_records},
    stock_line::{get_test_push_stock_line_records, get_test_stock_line_records},
    stocktake::{get_test_push_stocktake_records, get_test_stocktake_records},
    stocktake_line::{get_test_push_stocktake_line_records, get_test_stocktake_line_records},
    trans_line::{get_test_push_trans_line_records, get_test_trans_line_records},
    transact::{get_test_push_transact_records, get_test_transact_records},
};

use super::pull::{IntegrationRecord, IntegrationUpsertRecord};

pub mod location;
pub mod name_store_join;
pub mod number;
pub mod requisition;
pub mod requisition_line;
pub mod stock_line;
pub mod stocktake;
pub mod stocktake_line;
pub mod trans_line;
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

/// To be used in combination with TestSyncRecord.
/// I.e. first run and integrate a row from TestSyncRecord and then try to push this record out
#[allow(dead_code)]
pub struct TestSyncPushRecord {
    /// Change log event for the row to be pushed.
    /// Its assumed the row exists, e.g. because it has been integrated before through a
    /// TestSyncRecord
    pub change_log: ChangelogRow,
    /// Expected record as pushed out to the server
    pub push_data: serde_json::Value,
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
                IntegrationUpsertRecord::Location(comparison_record) => {
                    assert_eq!(
                        LocationRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .expect(&format!(
                                "Location row not found: {}",
                                &comparison_record.id
                            )),
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
                IntegrationUpsertRecord::Invoice(comparison_record) => {
                    assert_eq!(
                        InvoiceRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::InvoiceLine(comparison_record) => {
                    assert_eq!(
                        InvoiceLineRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::Stocktake(comparison_record) => {
                    assert_eq!(
                        StocktakeRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::StocktakeLine(comparison_record) => {
                    assert_eq!(
                        StocktakeLineRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::Requisition(comparison_record) => {
                    assert_eq!(
                        RequisitionRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .unwrap(),
                        comparison_record
                    )
                }
                IntegrationUpsertRecord::RequisitionLine(comparison_record) => {
                    assert_eq!(
                        RequisitionLineRowRepository::new(&connection)
                            .find_one_by_id(&comparison_record.id)
                            .unwrap()
                            .expect(&format!(
                                "RequisitionLine not found: {}",
                                &comparison_record.id
                            )),
                        comparison_record
                    )
                }
            }
        }
    }
}

#[allow(dead_code)]
pub fn get_all_remote_pull_test_records() -> Vec<TestSyncRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut get_test_number_records());
    test_records.append(&mut get_test_location_records());
    test_records.append(&mut get_test_stock_line_records());
    //test_records.append(&mut get_test_name_store_join_records());
    test_records.append(&mut get_test_transact_records());
    test_records.append(&mut get_test_trans_line_records());
    test_records.append(&mut get_test_stocktake_records());
    test_records.append(&mut get_test_stocktake_line_records());
    test_records.append(&mut get_test_requisition_records());
    test_records.append(&mut get_test_requisition_line_records());
    test_records
}

#[allow(dead_code)]
pub fn get_all_remote_push_test_records() -> Vec<TestSyncPushRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut get_test_push_number_records());
    test_records.append(&mut get_test_push_location_records());
    //test_records.append(&mut get_test_push_name_store_join_records());
    test_records.append(&mut get_test_push_stock_line_records());
    test_records.append(&mut get_test_push_transact_records());
    test_records.append(&mut get_test_push_trans_line_records());
    test_records.append(&mut get_test_push_stocktake_records());
    test_records.append(&mut get_test_push_stocktake_line_records());
    test_records.append(&mut get_test_push_requisition_records());
    test_records.append(&mut get_test_push_requisition_line_records());
    test_records
}
