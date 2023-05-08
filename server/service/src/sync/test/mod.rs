#[cfg(feature = "integration_test")]
mod integration;
mod pull_and_push;
pub(crate) mod test_data;

use super::translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable};
use crate::sync::translations::PullUpsertRecord;
use repository::{mock::MockData, *};
use util::inline_init;

#[derive(Clone)]
pub(crate) struct TestSyncPullRecord {
    /// Expected result for the imported data
    pub(crate) translated_record: Option<IntegrationRecords>,
    /// Row as stored in the remote sync buffer
    pub(crate) sync_buffer_row: SyncBufferRow,
    // Extra data that translation test relies on
    pub(crate) extra_data: Option<MockData>,
}

impl TestSyncPullRecord {
    fn new_pull_upsert(
        table_name: &str,
        // .0 = id .1 = data
        id_and_data: (&str, &str),
        result: PullUpsertRecord,
    ) -> TestSyncPullRecord {
        Self::new_pull_upserts(table_name, id_and_data, vec![result])
    }
    fn new_pull_upserts(
        table_name: &str,
        // .0 = id .1 = data
        id_and_data: (&str, &str),
        results: Vec<PullUpsertRecord>,
    ) -> TestSyncPullRecord {
        TestSyncPullRecord {
            translated_record: Some(IntegrationRecords::from_upserts(results)),
            sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
                r.table_name = table_name.to_owned();
                r.record_id = id_and_data.0.to_owned();
                r.data = id_and_data.1.to_owned();
                r.action = SyncBufferAction::Upsert;
            }),
            extra_data: None,
        }
    }

    fn new_pull_delete(
        table_name: &str,
        id: &str,
        result_table: PullDeleteRecordTable,
    ) -> TestSyncPullRecord {
        Self::new_pull_deletes(
            table_name,
            id,
            IntegrationRecords {
                upserts: vec![],
                deletes: vec![PullDeleteRecord {
                    table: result_table,
                    id: id.to_string(),
                }],
            },
        )
    }
    fn new_pull_deletes(
        table_name: &str,
        id: &str,
        delete_records: IntegrationRecords,
    ) -> TestSyncPullRecord {
        TestSyncPullRecord {
            translated_record: Some(delete_records),
            sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
                r.table_name = table_name.to_owned();
                r.record_id = id.to_string();
                r.data = "{}".to_string();
                r.action = SyncBufferAction::Delete;
            }),
            extra_data: None,
        }
    }

    pub(crate) async fn insert_extra_data(&self, connection: &StorageConnection) {
        if let Some(data) = &self.extra_data {
            data.insert(connection);
        }
    }
}

/// To be used in combination with TestSyncPullRecord.
/// I.e. first run and integrate a row from TestSyncPullRecord and then try to push this record out
#[derive(Debug)]
pub struct TestSyncPushRecord {
    /// Record id for the row to be pushed.
    /// Its assumed the row exists, e.g. because it has been integrated before through a
    /// TestSyncPullRecord
    pub record_id: String,
    pub table_name: String,
    /// Expected record as pushed out to the server
    pub push_data: serde_json::Value,
}

pub(crate) fn extract_sync_buffer_rows(records: &Vec<TestSyncPullRecord>) -> Vec<SyncBufferRow> {
    records
        .into_iter()
        .map(|test_record| test_record.sync_buffer_row.clone())
        .collect()
}

pub(crate) async fn insert_all_extra_data(
    records: &Vec<TestSyncPullRecord>,
    connection: &StorageConnection,
) {
    for record in records {
        record.insert_extra_data(connection).await
    }
}

macro_rules! check_record_by_id_ignore_is_sync_update {
    ($repository:ident, $connection:ident, $comparison_record:ident, $record_type:tt, $record_string:expr) => {{
        let record = $repository::new(&$connection)
            .find_one_by_id(&$comparison_record.id)
            .unwrap()
            .expect(&format!(
                "{} row not found: {}",
                $record_string, $comparison_record.id
            ));
        assert_eq!(
            $record_type {
                is_sync_update: false,
                ..record
            },
            $record_type {
                is_sync_update: false,
                ..$comparison_record
            }
        )
    }};
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

macro_rules! check_record_by_option_id {
    ($repository:ident, $connection:ident, $comparison_record:ident, $record_string:expr) => {{
        assert_eq!(
            $repository::new(&$connection)
                .find_one_by_id_option(&$comparison_record.id)
                .unwrap()
                .expect(&format!(
                    "{} row not found: {}",
                    $record_string, $comparison_record.id
                )),
            $comparison_record
        )
    }};
}

macro_rules! check_delete_record_by_id {
    ($repository:ident, $connection:ident, $id:ident) => {{
        assert_eq!(
            $repository::new(&$connection).find_one_by_id(&$id).unwrap(),
            None
        )
    }};
}

macro_rules! check_delete_record_by_id_option {
    ($repository:ident, $connection:ident, $id:ident) => {{
        assert_eq!(
            $repository::new(&$connection)
                .find_one_by_id_option(&$id)
                .unwrap(),
            None
        )
    }};
}
pub(crate) async fn check_records_against_database(
    con: &StorageConnection,
    records: IntegrationRecords,
) {
    for upsert in records.upserts {
        use PullUpsertRecord::*;
        match upsert {
            Location(record) => {
                check_record_by_id!(LocationRowRepository, con, record, "Location");
            }
            LocationMovement(record) => check_record_by_id!(
                LocationMovementRowRepository,
                con,
                record,
                "LocationMovement"
            ),
            StockLine(record) => {
                check_record_by_option_id!(StockLineRowRepository, con, record, "StockLine");
            }
            Name(record) => {
                check_record_by_id!(NameRowRepository, con, record, "Name");
            }
            NameTag(record) => {
                check_record_by_id!(NameTagRowRepository, con, record, "NameTag");
            }
            NameTagJoin(record) => {
                check_record_by_id!(NameTagJoinRepository, con, record, "NameTagJoin");
            }
            NameStoreJoin(record) => {
                check_record_by_id!(NameStoreJoinRepository, con, record, "NameStoreJoin");
            }
            Invoice(record) => {
                check_record_by_option_id!(InvoiceRowRepository, con, record, "Invoice");
            }
            InvoiceLine(record) => {
                check_record_by_option_id!(InvoiceLineRowRepository, con, record, "InvoiceLine");
            }
            Stocktake(record) => {
                check_record_by_id!(StocktakeRowRepository, con, record, "Stocktake");
            }
            StocktakeLine(record) => {
                check_record_by_id!(StocktakeLineRowRepository, con, record, "StocktakeLine");
            }
            Requisition(record) => {
                check_record_by_id_ignore_is_sync_update!(
                    RequisitionRowRepository,
                    con,
                    record,
                    RequisitionRow,
                    "Requisition"
                );
            }
            RequisitionLine(record) => {
                check_record_by_id_ignore_is_sync_update!(
                    RequisitionLineRowRepository,
                    con,
                    record,
                    RequisitionLineRow,
                    "RequisitionLine"
                );
            }
            Unit(record) => {
                check_record_by_option_id!(UnitRowRepository, con, record, "Unit");
            }
            Item(record) => check_record_by_id!(ItemRowRepository, con, record, "Item"),
            Store(record) => check_record_by_id!(StoreRowRepository, con, record, "Store"),
            MasterList(record) => {
                check_record_by_option_id!(MasterListRowRepository, con, record, "Masterlist")
            }

            MasterListLine(record) => {
                check_record_by_option_id!(
                    MasterListLineRowRepository,
                    con,
                    record,
                    "MasterListLine"
                )
            }

            MasterListNameJoin(record) => check_record_by_option_id!(
                MasterListNameJoinRepository,
                con,
                record,
                "MasterListNameJoin"
            ),

            PeriodSchedule(record) => {
                check_record_by_id!(PeriodScheduleRowRepository, con, record, "PeriodSchedule")
            }

            Period(record) => check_record_by_id!(PeriodRowRepository, con, record, "Period"),
            Program(record) => check_record_by_id!(ProgramRowRepository, con, record, "Program"),
            ProgramRequisitionSettings(record) => check_record_by_id!(
                ProgramRequisitionSettingsRowRepository,
                con,
                record,
                "ProgramRequisitionSettings"
            ),
            ProgramRequisitionOrderType(record) => check_record_by_id!(
                ProgramRequisitionOrderTypeRowRepository,
                con,
                record,
                "ProgramRequisitionOrderType"
            ),
            Report(record) => check_record_by_id!(ReportRowRepository, con, record, "Report"),

            ActivityLog(record) => {
                check_record_by_id!(ActivityLogRowRepository, con, record, "ActivityLog")
            }

            InventoryAdjustmentReason(record) => check_record_by_id!(
                InventoryAdjustmentReasonRowRepository,
                con,
                record,
                "InventoryAdjustmentReason"
            ),

            StorePreference(record) => {
                check_record_by_id!(StorePreferenceRowRepository, con, record, "StorePreference")
            }
            Barcode(record) => check_record_by_id!(BarcodeRowRepository, con, record, "Barcode"),
        }
    }

    for delete in records.deletes {
        use PullDeleteRecordTable::*;
        let id = delete.id;
        match delete.table {
            Name => {
                check_delete_record_by_id!(NameRowRepository, con, id)
            }
            NameTagJoin => {
                check_delete_record_by_id!(NameTagJoinRepository, con, id)
            }
            Unit => {
                check_delete_record_by_id_option!(UnitRowRepository, con, id)
            }
            Item => check_delete_record_by_id!(ItemRowRepository, con, id),
            Store => check_delete_record_by_id!(StoreRowRepository, con, id),
            ProgramRequisitionOrderType => {
                check_delete_record_by_id!(ProgramRequisitionOrderTypeRowRepository, con, id)
            }
            ProgramRequisitionSettings => {
                check_delete_record_by_id!(ProgramRequisitionSettingsRowRepository, con, id)
            }
            MasterListNameJoin => {
                check_delete_record_by_id_option!(MasterListNameJoinRepository, con, id)
            }
            Report => check_delete_record_by_id!(ReportRowRepository, con, id),
            NameStoreJoin => check_delete_record_by_id!(ReportRowRepository, con, id),
            Invoice => check_delete_record_by_id_option!(MasterListNameJoinRepository, con, id),
            InvoiceLine => {
                check_delete_record_by_id_option!(MasterListNameJoinRepository, con, id)
            }
            Requisition => check_delete_record_by_id!(ReportRowRepository, con, id),
            RequisitionLine => check_delete_record_by_id!(ReportRowRepository, con, id),
            InventoryAdjustmentReason => {
                check_delete_record_by_id!(InventoryAdjustmentReasonRowRepository, con, id)
            }
            #[cfg(feature = "integration_test")]
            Location => check_delete_record_by_id!(LocationRowRepository, con, id),
            #[cfg(feature = "integration_test")]
            LocationMovement => check_delete_record_by_id!(LocationMovementRowRepository, con, id),
            #[cfg(feature = "integration_test")]
            StockLine => check_delete_record_by_id_option!(StockLineRowRepository, con, id),
            #[cfg(feature = "integration_test")]
            Stocktake => check_delete_record_by_id!(StocktakeRowRepository, con, id),
            #[cfg(feature = "integration_test")]
            StocktakeLine => check_delete_record_by_id!(StocktakeLineRowRepository, con, id),
            #[cfg(feature = "integration_test")]
            ActivityLog => check_delete_record_by_id!(ActivityLogRowRepository, con, id),
        }
    }
}
pub(crate) async fn check_test_records_against_database(
    con: &StorageConnection,
    test_records: Vec<TestSyncPullRecord>,
) {
    for test_record in test_records {
        let translated_record = match test_record.translated_record {
            Some(translated_record) => translated_record,
            None => continue,
        };
        check_records_against_database(con, translated_record).await;
    }
}
