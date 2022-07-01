// mod integration;
mod pull_and_push;
pub(crate) mod test_data;

use super::translations::IntegrationRecords;
use crate::sync::translations::PullUpsertRecord;
use repository::*;
use util::inline_init;

#[derive(Clone)]
pub(crate) struct TestSyncPullRecord {
    /// Expected result for the imported data
    pub(crate) translated_record: Option<IntegrationRecords>,
    /// Row as stored in the remote sync buffer
    pub sync_buffer_row: SyncBufferRow,
}

impl TestSyncPullRecord {
    fn new_pull_upsert(
        table_name: &str,
        // .0 = id .1 = data
        id_and_data: (&str, &str),
        result: PullUpsertRecord,
    ) -> TestSyncPullRecord {
        TestSyncPullRecord {
            translated_record: Some(IntegrationRecords::from_upsert(result)),
            sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
                r.table_name = table_name.to_owned();
                r.record_id = id_and_data.0.to_owned();
                r.data = id_and_data.1.to_owned();
            }),
        }
    }
}

/// To be used in combination with TestSyncPullRecord.
/// I.e. first run and integrate a row from TestSyncPullRecord and then try to push this record out
#[derive(Debug)]
pub struct TestSyncPushRecord {
    /// Change log event for the row to be pushed.
    /// Its assumed the row exists, e.g. because it has been integrated before through a
    /// TestSyncPullRecord
    pub change_log: ChangelogRow,
    /// Expected record as pushed out to the server
    pub push_data: serde_json::Value,
}

pub(crate) fn extract_sync_buffer_rows(records: &Vec<TestSyncPullRecord>) -> Vec<SyncBufferRow> {
    records
        .into_iter()
        .map(|test_record| test_record.sync_buffer_row.clone())
        .collect()
}

macro_rules! check_record_by_id {
    ($repository:ident, $connection:ident, $comparison_record:ident, $record_string:expr) => {{
        assert_eq!(
            $repository::new(&$connection)
                .find_one_by_id(&$comparison_record.id)
                .unwrap()
                .expect(&format!(
                    "{} row not found: {}",
                    $record_string, $comparison_record.id
                )),
            $comparison_record
        )
    }};
}

pub(crate) async fn check_records_against_database(
    con: &StorageConnection,
    records: Vec<TestSyncPullRecord>,
) {
    use PullUpsertRecord::*;
    for record in records {
        let translated_record = match record.translated_record {
            Some(translated_record) => translated_record,
            None => continue,
        };
        for upsert in translated_record.upserts {
            match upsert {
                Number(comparison_record) => {
                    assert_eq!(
                        NumberRowRepository::new(&con)
                            .find_one_by_type_and_store(
                                &comparison_record.r#type,
                                &comparison_record.store_id
                            )
                            .unwrap()
                            .expect(&format!("Number not found: {}", &comparison_record.id)),
                        comparison_record
                    )
                }
                Location(record) => {
                    check_record_by_id!(LocationRowRepository, con, record, "Location");
                }
                StockLine(record) => {
                    assert_eq!(
                        StockLineRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .expect(&format!("StockLine row not found: {}", record.id)),
                        record
                    )
                }
                Name(record) => {
                    check_record_by_id!(NameRowRepository, con, record, "Name");
                }
                NameStoreJoin(record) => {
                    check_record_by_id!(NameStoreJoinRepository, con, record, "NameStoreJoin");
                }
                Invoice(record) => {
                    assert_eq!(
                        InvoiceRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .expect(&format!("Invoice row not found: {}", record.id)),
                        record
                    )
                }
                InvoiceLine(record) => {
                    assert_eq!(
                        InvoiceLineRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .expect(&format!("InvoiceLine row not found: {}", record.id)),
                        record
                    )
                }
                Stocktake(record) => {
                    check_record_by_id!(StocktakeRowRepository, con, record, "Stocktake");
                }
                StocktakeLine(record) => {
                    check_record_by_id!(StocktakeLineRowRepository, con, record, "StocktakeLine");
                }
                Requisition(record) => {
                    check_record_by_id!(RequisitionRowRepository, con, record, "Requisition");
                }
                RequisitionLine(record) => {
                    check_record_by_id!(
                        RequisitionLineRowRepository,
                        con,
                        record,
                        "RequisitionLine"
                    );
                }
                Unit(record) => {
                    assert_eq!(
                        UnitRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .await
                            .expect(&format!("Unit row not found: {}", record.id)),
                        record
                    )
                }
                Item(record) => check_record_by_id!(ItemRowRepository, con, record, "Item"),
                Store(record) => check_record_by_id!(StoreRowRepository, con, record, "Store"),
                MasterList(record) => {
                    assert_eq!(
                        MasterListRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .await
                            .expect(&format!("MasterList row not found: {}", record.id)),
                        record
                    )
                }
                MasterListLine(record) => {
                    assert_eq!(
                        MasterListLineRowRepository::new(&con)
                            .find_one_by_id(&record.id)
                            .await
                            .expect(&format!("MasterListLine row not found: {}", record.id)),
                        record
                    )
                }
                MasterListNameJoin(record) => assert_eq!(
                    MasterListNameJoinRepository::new(&con)
                        .find_one_by_id(&record.id)
                        .await
                        .expect(&format!("MasterList row not found: {}", record.id)),
                    record
                ),
                Report(record) => check_record_by_id!(ReportRowRepository, con, record, "Report"),
            }
        }
    }
}
