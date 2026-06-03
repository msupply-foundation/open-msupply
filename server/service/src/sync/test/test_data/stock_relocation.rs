use crate::sync::test::TestSyncIncomingRecord;
use chrono::NaiveDate;
use repository::{StockRelocationRow, StockRelocationRowDelete, StockRelocationStatus};

const TABLE_NAME: &str = "replenishment";

const STOCK_RELOCATION_1: (&str, &str) = (
    "stock_relocation_1",
    r#"{
    "ID": "stock_relocation_1",
    "store_ID": "store_a",
    "user_ID_created_by": "user_account_a",
    "from_item_line_ID": "stock_line_a",
    "from_number_of_packs": 5,
    "from_location_ID": "location_1",
    "to_item_line_ID": "stock_line_b",
    "to_location_ID": "location_2",
    "date_created": "2024-01-15",
    "date_finalised": "0000-00-00",
    "status": "sg"
    }"#,
);

const STOCK_RELOCATION_2: (&str, &str) = (
    "stock_relocation_2",
    r#"{
    "ID": "stock_relocation_2",
    "store_ID": "store_b",
    "user_ID_created_by": "user_account_b",
    "from_item_line_ID": "stock_line_c",
    "from_number_of_packs": 10,
    "from_location_ID": "",
    "to_item_line_ID": "",
    "to_location_ID": "",
    "date_created": "2024-02-01",
    "date_finalised": "2024-02-05",
    "status": "fn",
    "oms_fields": {
        "created_datetime": "2024-02-01T08:30:00",
        "finalised_datetime": "2024-02-05T14:00:00"
    }
    }"#,
);

fn stock_relocation_1_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        STOCK_RELOCATION_1,
        StockRelocationRow {
            id: STOCK_RELOCATION_1.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 15)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            finalised_datetime: None,
            from_stock_line_id: "stock_line_a".to_string(),
            from_location_id: Some("location_1".to_string()),
            from_number_of_packs: 5.0,
            to_stock_line_id: Some("stock_line_b".to_string()),
            to_location_id: Some("location_2".to_string()),
            status: StockRelocationStatus::Suggested,
            store_id: "store_a".to_string(),
            user_id: "user_account_a".to_string(),
        },
    )
}

fn stock_relocation_2_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        STOCK_RELOCATION_2,
        StockRelocationRow {
            id: STOCK_RELOCATION_2.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
                .unwrap()
                .and_hms_opt(8, 30, 0)
                .unwrap(),
            finalised_datetime: Some(
                NaiveDate::from_ymd_opt(2024, 2, 5)
                    .unwrap()
                    .and_hms_opt(14, 0, 0)
                    .unwrap(),
            ),
            from_stock_line_id: "stock_line_c".to_string(),
            from_location_id: None,
            from_number_of_packs: 10.0,
            to_stock_line_id: None,
            to_location_id: None,
            status: StockRelocationStatus::Finalised,
            store_id: "store_b".to_string(),
            user_id: "user_account_b".to_string(),
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        stock_relocation_1_pull_record(),
        stock_relocation_2_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        STOCK_RELOCATION_1.0,
        StockRelocationRowDelete(STOCK_RELOCATION_1.0.to_string()),
    )]
}
